package com.booksys.booking;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Request and response types of the public (website) booking API.
 */
public final class OnlineBookingDtos {

    private OnlineBookingDtos() {}

    /** Stay to price: room, dates, optional add-on services and voucher. */
    public record QuoteRequest(
            UUID roomId,
            LocalDate checkIn,
            LocalDate checkOut,
            List<UUID> serviceIds,
            String voucherCode
    ) {}

    /** A booking request from the website, for either payment option. */
    public record BookingRequest(
            UUID roomId,
            LocalDate checkIn,
            LocalDate checkOut,
            String firstName,
            String lastName,
            String email,
            String phone,
            List<UUID> serviceIds,
            String voucherCode,
            String specialRequests
    ) {}

    /** Confirms an online payment after Stripe reported success to the browser. */
    public record ConfirmPaymentRequest(String paymentIntentId) {}

    /** Which payment options the website should offer. */
    public record BookingOptions(
            boolean payAtHotel,
            boolean onlinePayment,
            String stripePublishableKey,
            int maxNights,
            int maxAdvanceDays
    ) {}

    /** What the browser needs to show the Stripe payment form for a held booking. */
    public record StripeCheckout(
            UUID bookingId,
            String reference,
            String clientSecret,
            String paymentIntentId,
            BigDecimal amount,
            String currency,
            String publishableKey,
            LocalDateTime holdExpiresAt
    ) {}

    /** Summary shown on the confirmation page. */
    public record BookingConfirmation(
            UUID bookingId,
            String reference,
            String guestName,
            String email,
            String hotel,
            Integer room,
            LocalDate checkIn,
            LocalDate checkOut,
            BigDecimal total,
            String currency,
            String bookingStatus,
            String paymentStatus,
            String paymentOption
    ) {}
}
