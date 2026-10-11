package com.booksys.stripe;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

/**
 * Thin wrapper around the Stripe SDK so the booking logic can be unit-tested
 * with a mock instead of real network calls.
 */
@Service
public class StripeService {

    /** PaymentIntent states in which Stripe still allows {@code cancel()}. */
    private static final Set<String> CANCELABLE = Set.of(
            "requires_payment_method", "requires_confirmation", "requires_action", "requires_capture");

    @Value("${stripe.secret-key}")
    private String secretKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = secretKey;
    }

    /**
     * Creates a PaymentIntent for an amount the server calculated itself.
     *
     * @param amountMinorUnits amount in the smallest currency unit (cents for EUR)
     * @param currency         ISO currency code, e.g. "EUR"
     * @param description      text shown in the Stripe dashboard
     * @param metadata         booking reference data, echoed back in webhooks
     * @param idempotencyKey   makes a retried request return the same intent
     */
    public PaymentIntent createPaymentIntent(long amountMinorUnits, String currency, String description,
                                             Map<String, String> metadata, String idempotencyKey)
            throws StripeException {

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountMinorUnits)
                .setCurrency(currency.toLowerCase())
                .setDescription(description)
                .putAllMetadata(metadata)
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                )
                .build();

        RequestOptions options = RequestOptions.builder()
                .setIdempotencyKey(idempotencyKey)
                .build();
        return PaymentIntent.create(params, options);
    }

    /** Retrieves an existing PaymentIntent by its ID. */
    public PaymentIntent retrieve(String paymentIntentId) throws StripeException {
        return PaymentIntent.retrieve(paymentIntentId);
    }

    /**
     * Cancels a PaymentIntent if Stripe still allows it, so an expired booking
     * hold can no longer be paid.
     *
     * @return {@code true} when the intent is (now) cancelled
     */
    public boolean cancelIfPossible(PaymentIntent intent) throws StripeException {
        if ("canceled".equals(intent.getStatus())) return true;
        if (!CANCELABLE.contains(intent.getStatus())) return false;
        intent.cancel();
        return true;
    }
}
