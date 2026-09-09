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
        String    phone
) {}
// Card fields used to be accepted here and were never read. Unused card data
// still crosses the network and lands in request logs, so it is not accepted
// at all; the demo booking path records a payment without card details.
