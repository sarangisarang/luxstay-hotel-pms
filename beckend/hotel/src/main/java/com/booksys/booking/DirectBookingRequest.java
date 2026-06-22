package com.booksys.booking;

import java.time.LocalDate;
import java.util.UUID;

public record DirectBookingRequest(
        UUID      roomId,
        LocalDate checkIn,
        LocalDate checkOut,
        String    firstName,
        String    lastName,
        String    email,
        String    phone,
        String    cardNumber,
        String    cardExpiry,
        String    cardCvv
) {}
