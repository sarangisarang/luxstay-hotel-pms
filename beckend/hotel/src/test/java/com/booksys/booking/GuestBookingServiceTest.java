package com.booksys.booking;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class GuestBookingServiceTest {

    private final LocalDate today = LocalDate.of(2026, 10, 11);

    @Test
    void guestsMayCancelOpenBookingsUntilArrivalDay() {
        assertTrue(GuestBookingService.canCancel(booking(BookingStatus.CONFIRMED, today.plusDays(3)), today));
        assertTrue(GuestBookingService.canCancel(booking(BookingStatus.PENDING, today), today));
    }

    @Test
    void startedFinishedOrPastBookingsCannotBeCancelledOnline() {
        assertFalse(GuestBookingService.canCancel(booking(BookingStatus.CONFIRMED, today.minusDays(1)), today));
        assertFalse(GuestBookingService.canCancel(booking(BookingStatus.CHECKED_IN, today), today));
        assertFalse(GuestBookingService.canCancel(booking(BookingStatus.CHECKED_OUT, today.plusDays(1)), today));
        assertFalse(GuestBookingService.canCancel(booking(BookingStatus.COMPLETED, today.plusDays(1)), today));
        assertFalse(GuestBookingService.canCancel(booking(BookingStatus.CANCELLED, today.plusDays(1)), today));
        assertFalse(GuestBookingService.canCancel(booking(null, today.plusDays(1)), today));
        assertFalse(GuestBookingService.canCancel(booking(BookingStatus.CONFIRMED, null), today));
    }

    private static Booking booking(BookingStatus status, LocalDate checkIn) {
        Booking b = new Booking();
        b.setBookingStatus(status);
        b.setCheckInDate(checkIn);
        return b;
    }
}
