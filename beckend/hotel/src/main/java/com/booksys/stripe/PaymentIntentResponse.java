package com.booksys.stripe;

public record PaymentIntentResponse(
        String clientSecret,
        String paymentIntentId,
        String publishableKey
) {}
