package com.booksys.stripe;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
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
 * Set the signing secret as env var STRIPE_WEBHOOK_SECRET (mandatory — app refuses to start without it).
 */
@Slf4j
@RestController
@RequestMapping("/api/public/stripe")
@RequiredArgsConstructor
public class StripeWebhookController {

    private final BookingRepository  bookingRepository;
    private final PaymentRepository  paymentRepository;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    @PostConstruct
    public void validateStripeWebhookSecret() {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new IllegalStateException("STRIPE_WEBHOOK_SECRET is required and must not be empty.");
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

    private void handleSucceeded(Event event) {
        extractPaymentIntentId(event).ifPresent(piId ->
            bookingRepository.findByStripePaymentIntentId(piId).ifPresent(b -> {
                if (b.getPaymentStatus() != PaymentStatus.PAID) {
                    b.setPaymentStatus(PaymentStatus.PAID);
                    bookingRepository.save(b);
                    log.info("Webhook: booking {} marked PAID via PaymentIntent {}", b.getId(), piId);
                }
            })
        );
    }

    private void handleFailed(Event event) {
        extractPaymentIntentId(event).ifPresent(piId ->
            bookingRepository.findByStripePaymentIntentId(piId).ifPresent(b -> {
                b.setPaymentStatus(PaymentStatus.FAILED);
                b.setBookingStatus(BookingStatus.CANCELLED);
                bookingRepository.save(b);
                log.warn("Webhook: booking {} payment FAILED (PaymentIntent {})", b.getId(), piId);
            })
        );
    }

    private void handleRefunded(Event event) {
        extractPaymentIntentId(event).ifPresent(piId ->
            bookingRepository.findByStripePaymentIntentId(piId).ifPresent(b -> {
                b.setPaymentStatus(PaymentStatus.REFUNDED);
                bookingRepository.save(b);
                paymentRepository.findFirstByBookingId(b.getId())
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
