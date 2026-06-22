package com.booksys.email;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BookingEmailData(
        String bookingRef,
        String guestEmail,
        String guestName,
        String hotelName,
        String roomNumber,
        LocalDate checkIn,
        LocalDate checkOut,
        long nights,
        BigDecimal total
) {}
