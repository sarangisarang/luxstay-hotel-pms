package com.booksys.booking;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Settings for bookings made on the public website (see application.properties).
 * A plain class rather than a record so Spring's {@code @Value} handling stays
 * on constructor parameters only.
 */
@Component
public class OnlineBookingSettings {

    private final boolean payAtHotelEnabled;
    private final int maxNights;
    private final int maxAdvanceDays;
    private final int maxOpenBookingsPerEmail;
    private final boolean stripeEnabled;
    private final int stripeHoldMinutes;
    private final String stripePublishableKey;

    /**
     * @param payAtHotelEnabled       guests may book now and pay at the hotel
     * @param maxNights               longest stay that can be booked online
     * @param maxAdvanceDays          how far ahead a stay may start
     * @param maxOpenBookingsPerEmail open (not ended, not cancelled) bookings allowed per email,
     *                                so one person cannot block the whole hotel anonymously
     * @param stripeEnabled           online card payment through Stripe is switched on
     * @param stripeHoldMinutes       how long a room is held while the guest pays online
     * @param stripePublishableKey    public Stripe key handed to the browser
     */
    public OnlineBookingSettings(
            @Value("${app.booking.pay-at-hotel-enabled:true}") boolean payAtHotelEnabled,
            @Value("${app.booking.max-nights:30}") int maxNights,
            @Value("${app.booking.max-advance-days:550}") int maxAdvanceDays,
            @Value("${app.booking.max-open-bookings-per-email:3}") int maxOpenBookingsPerEmail,
            @Value("${app.payments.stripe.enabled:false}") boolean stripeEnabled,
            @Value("${app.payments.stripe.hold-minutes:30}") int stripeHoldMinutes,
            @Value("${stripe.publishable-key:}") String stripePublishableKey) {
        this.payAtHotelEnabled = payAtHotelEnabled;
        this.maxNights = maxNights;
        this.maxAdvanceDays = maxAdvanceDays;
        this.maxOpenBookingsPerEmail = maxOpenBookingsPerEmail;
        this.stripeEnabled = stripeEnabled;
        this.stripeHoldMinutes = stripeHoldMinutes;
        this.stripePublishableKey = stripePublishableKey;
    }

    public boolean payAtHotelEnabled()    { return payAtHotelEnabled; }
    public int maxNights()                { return maxNights; }
    public int maxAdvanceDays()           { return maxAdvanceDays; }
    public int maxOpenBookingsPerEmail()  { return maxOpenBookingsPerEmail; }
    public boolean stripeEnabled()        { return stripeEnabled; }
    public int stripeHoldMinutes()        { return stripeHoldMinutes; }
    public String stripePublishableKey()  { return stripePublishableKey; }
}
