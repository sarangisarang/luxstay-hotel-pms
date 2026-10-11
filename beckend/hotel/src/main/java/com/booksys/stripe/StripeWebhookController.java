package com.booksys.stripe;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.OnlineBookingService;
import com.booksys.payment.Payment;
import com.booksys.payment.PaymentRepository;
import com.booksys.payment.PaymentStatus;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Receives Stripe webhook events for async payment lifecycle signals.
 *
 * Configure the webhook in Stripe Dashboard → Developers → Webhooks:
 *   Endpoint URL : https://your-domain/api/public/stripe/webhook
 *   Events       : payment_intent.succeeded, payment_intent.payment_failed,
 *                  charge.refunded
 *
 * Set the signing secret as env var STRIPE_WEBHOOK_SECRET (required when STRIPE_ENABLED=true).
 */
@Slf4j
@RestController
@RequestMapping("/api/public/stripe")
@RequiredArgsConstructor
public class StripeWebhookController {

    private final BookingRepository    bookingRepository;
    private final PaymentRepository    paymentRepository;
    private final OnlineBookingService onlineBookingService;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    @Value("${app.payments.stripe.enabled:false}")
    private boolean stripeEnabled;

    /**
     * With online payment switched on, a missing signing secret would mean
     * every webhook is rejected (or, worse, nobody notices). Fail at startup
     * instead. With online payment off the webhook is unused.
     */
    @PostConstruct
    public void validateStripeWebhookSecret() {
        if (stripeEnabled && (webhookSecret == null || webhookSecret.isBlank()
                || webhookSecret.contains("dummy") || webhookSecret.equals("whsec_..."))) {
            throw new IllegalStateException(
                    "STRIPE_WEBHOOK_SECRET must be set to the real signing secret when STRIPE_ENABLED=true.");
        }
    }

    @PostMapping(value = "/webhook", consumes = "application/json")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature mismatch: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Invalid signature");
        } catch (Exception e) {
            log.error("Webhook parse error: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Parse error");
        }

        log.info("Stripe webhook: {}", event.getType());

        switch (event.getType()) {
            case "payment_intent.succeeded"       -> handleSucceeded(event);
            case "payment_intent.payment_failed"  -> handleFailed(event);
            case "charge.refunded"                -> handleRefunded(event);
            default -> log.debug("Unhandled webhook event: {}", event.getType());
        }

        return ResponseEntity.ok("received");
    }

    /**
     * Confirms the booking through the same verification as the browser path
     * (status, amount, currency, booking reference). Idempotent: if the browser
     * already confirmed it, nothing changes.
     */
    private void handleSucceeded(Event event) {
        extractPaymentIntentId(event).ifPresent(piId -> {
            try {
                onlineBookingService.confirmStripePayment(piId);
                log.info("Webhook: PaymentIntent {} confirmed", piId);
            } catch (RuntimeException e) {
                // Unknown intent (e.g. created outside the booking flow) or a
                // mismatch: log loudly, but answer 200 so Stripe does not retry forever.
                log.error("Webhook: could not confirm PaymentIntent {}: {}", piId, e.getMessage());
            }
        });
    }

    /** A failed attempt: the guest may retry until the room hold expires. */
    private void handleFailed(Event event) {
        extractPaymentIntentId(event).ifPresent(piId -> {
            onlineBookingService.markStripePaymentFailed(piId);
            log.warn("Webhook: payment attempt failed for PaymentIntent {}", piId);
        });
    }

    private void handleRefunded(Event event) {
        extractPaymentIntentId(event).ifPresent(piId ->
            bookingRepository.findByStripePaymentIntentId(piId).ifPresent(b -> {
                b.setPaymentStatus(PaymentStatus.REFUNDED);
                bookingRepository.save(b);
                // Several payments can exist per booking: refund the one Stripe charged
                paymentRepository.findByBookingId(b.getId()).stream()
                        .filter(p -> piId.equals(p.getExternalReference()))
                        .findFirst()
                        .or(() -> paymentRepository.findFirstByBookingId(b.getId()))
                        .ifPresent(p -> { p.setStatus(PaymentStatus.REFUNDED); paymentRepository.save(p); });
                log.info("Webhook: booking {} REFUNDED (PaymentIntent {})", b.getId(), piId);
            })
        );
    }

    private Optional<String> extractPaymentIntentId(Event event) {
        try {
            var dataObject = event.getDataObjectDeserializer().getObject();
            if (dataObject.isEmpty()) return Optional.empty();
            Object obj = dataObject.get();
            if (obj instanceof PaymentIntent pi) return Optional.of(pi.getId());
            // charge.refunded carries a Charge whose payment_intent field is the PI id
            if (obj instanceof com.stripe.model.Charge charge)
                return Optional.ofNullable(charge.getPaymentIntent());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Could not extract PaymentIntent id from event {}: {}", event.getType(), e.getMessage());
            return Optional.empty();
        }
    }
}
