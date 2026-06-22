package com.booksys.stripe;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PaymentIntentRequest(
        UUID roomId,
        LocalDate checkIn,
        LocalDate checkOut,
        BigDecimal amount,
        String currency
) {}
