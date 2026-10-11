package com.booksys.stripe;

import com.booksys.booking.OnlineBookingDtos;
import com.booksys.booking.OnlineBookingService;
import com.booksys.booking.OnlineBookingSettings;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Public Stripe endpoints of the website checkout.
 */
@RestController
@RequestMapping("/api/public/stripe")
@RequiredArgsConstructor
public class StripeController {

    private final OnlineBookingService onlineBookingService;
    private final OnlineBookingSettings settings;

    /**
     * Holds the room and creates a PaymentIntent for the server-calculated total.
     * The amount is never taken from the request: the old endpoint charged
     * whatever amount the browser sent.
     *
     * @return client secret for the Stripe Payment Element, booking reference and hold expiry
     */
    @PostMapping("/create-payment-intent")
    public ResponseEntity<OnlineBookingDtos.StripeCheckout> createPaymentIntent(
            @RequestBody OnlineBookingDtos.BookingRequest req) {
        return ResponseEntity.ok(onlineBookingService.startStripeCheckout(req));
    }

    /** Tells the browser whether online payment is on, and the publishable key when it is. */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        Map<String, Object> body = new HashMap<>();
        body.put("enabled", settings.stripeEnabled());
        if (settings.stripeEnabled()) {
            body.put("publishableKey", settings.stripePublishableKey());
        }
        return ResponseEntity.ok(body);
    }
}
