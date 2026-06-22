package com.booksys.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/public/stripe")
@RequiredArgsConstructor
public class StripeController {

    private final StripeService stripeService;

    @Value("${stripe.publishable-key}")
    private String publishableKey;

    /**
     * Creates a PaymentIntent and returns the clientSecret to the frontend.
     * The frontend uses the clientSecret with Stripe Elements to collect card details.
     */
    @PostMapping("/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody PaymentIntentRequest req) {
        try {
            BigDecimal amount = req.amount() != null ? req.amount() : BigDecimal.ZERO;
            String currency   = req.currency() != null ? req.currency() : "eur";
            String desc = "Room booking %s → %s".formatted(req.checkIn(), req.checkOut());

            PaymentIntent intent = stripeService.createPaymentIntent(amount, currency, desc);

            return ResponseEntity.ok(new PaymentIntentResponse(
                    intent.getClientSecret(),
                    intent.getId(),
                    publishableKey
            ));
        } catch (StripeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Returns just the publishable key so the frontend can init Stripe.js. */
    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> config() {
        return ResponseEntity.ok(Map.of("publishableKey", publishableKey));
    }
}
