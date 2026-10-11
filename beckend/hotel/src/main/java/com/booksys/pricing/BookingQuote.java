package com.booksys.pricing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Server-side price of a stay. The guest sees exactly these numbers before
 * booking, and the booking (or the Stripe charge) is created from them, so the
 * displayed price and the charged price cannot drift apart.
 *
 * @param roomId        booked room
 * @param roomTypeId    room type of that room
 * @param checkIn       arrival date (first night)
 * @param checkOut      departure date (exclusive)
 * @param nights        number of nights
 * @param nightly       per-night prices after weekend / season uplifts
 * @param roomTotal     sum of the nightly prices
 * @param services      chosen add-on services
 * @param servicesTotal sum of the service prices
 * @param voucherCode   applied voucher code, or {@code null}
 * @param voucherName   display name of the applied voucher, or {@code null}
 * @param discount      voucher discount (zero when none)
 * @param total         amount to pay: room + services − discount
 * @param currency      ISO currency code of the hotel, e.g. "EUR"
 */
public record BookingQuote(
        UUID roomId,
        UUID roomTypeId,
        LocalDate checkIn,
        LocalDate checkOut,
        long nights,
        List<NightPrice> nightly,
        BigDecimal roomTotal,
        List<ServiceLine> services,
        BigDecimal servicesTotal,
        String voucherCode,
        String voucherName,
        BigDecimal discount,
        BigDecimal total,
        String currency
) {
    /** Price of one night. */
    public record NightPrice(LocalDate date, BigDecimal price) {}

    /** One chosen add-on service. */
    public record ServiceLine(UUID id, String name, BigDecimal price) {}

    /** Total in the smallest currency unit (cents), as Stripe expects it. */
    public long totalInMinorUnits() {
        return total.movePointRight(2).longValueExact();
    }
}
