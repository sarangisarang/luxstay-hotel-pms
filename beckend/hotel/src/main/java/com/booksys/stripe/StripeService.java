package com.booksys.stripe;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class StripeService {

    @Value("${stripe.secret-key}")
    private String secretKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = secretKey;
    }

    /**
     * Creates a Stripe PaymentIntent for the given amount.
     * Amount is in the smallest currency unit (cents for EUR/USD).
     *
     * @param amount      booking total in major currency units (e.g. 120.50)
     * @param currency    ISO currency code (e.g. "eur", "usd")
     * @param description human-readable description shown on Stripe dashboard
     * @return the created PaymentIntent (contains clientSecret for frontend)
     */
    public PaymentIntent createPaymentIntent(BigDecimal amount, String currency, String description)
            throws StripeException {

        long amountInCents = amount.multiply(BigDecimal.valueOf(100)).longValue();

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency(currency.toLowerCase())
                .setDescription(description)
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                )
                .build();

        return PaymentIntent.create(params);
    }

    /**
     * Retrieves an existing PaymentIntent by its ID.
     */
    public PaymentIntent retrieve(String paymentIntentId) throws StripeException {
        return PaymentIntent.retrieve(paymentIntentId);
    }
}
