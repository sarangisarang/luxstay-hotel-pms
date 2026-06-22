package com.booksys.user;

import java.math.BigDecimal;

public record AdminStatsResponse(
        long totalBookings,
        long activeBookings,
        long totalGuests,
        long occupiedRooms,
        long freeRooms,
        BigDecimal revenueToday,
        BigDecimal revenueMonth
) {}

