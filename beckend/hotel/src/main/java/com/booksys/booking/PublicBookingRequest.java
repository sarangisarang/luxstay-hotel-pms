package com.booksys.booking;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Payload sent by the public booking page when a guest completes checkout.
 * The guest may already exist (returning guest) or be created on the fly.
 */
public record PublicBookingRequest(
        UUID    roomId,
        LocalDate checkIn,
        LocalDate checkOut,

        // Guest details (used to find-or-create the guest record)
        String  firstName,
        String  lastName,
        String  email,
        String  phone,

        // Stripe PaymentIntent ID — we verify it was actually paid
        String  paymentIntentId
) {}
