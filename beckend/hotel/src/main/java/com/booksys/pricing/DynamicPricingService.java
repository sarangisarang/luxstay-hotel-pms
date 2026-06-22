package com.booksys.pricing;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;

/**
 * Applies weekend and peak-season multipliers to a base nightly rate.
 *
 * Multipliers:
 *   Weekend (Fri/Sat)   → +30 %
 *   Peak season (Jun–Aug, Dec) → +25 %
 *   Both apply additively  (e.g. peak weekend = base × 1.55)
 */
@Service
public class DynamicPricingService {

    private static final BigDecimal WEEKEND_UPLIFT = new BigDecimal("0.30");
    private static final BigDecimal PEAK_UPLIFT    = new BigDecimal("0.25");

    /**
     * Calculates the total room charge for [checkIn, checkOut) with dynamic pricing.
     *
     * @param baseNightlyRate the room type's base price per night
     * @param checkIn         first night (inclusive)
     * @param checkOut        departure date (exclusive)
     * @return total amount rounded to 2 decimal places
     */
    public BigDecimal calculateTotal(BigDecimal baseNightlyRate, LocalDate checkIn, LocalDate checkOut) {
        if (baseNightlyRate == null || checkIn == null || checkOut == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal total = BigDecimal.ZERO;
        for (LocalDate night = checkIn; night.isBefore(checkOut); night = night.plusDays(1)) {
            total = total.add(nightlyPrice(baseNightlyRate, night));
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Returns the effective price for a single night starting on {@code date}.
     */
    public BigDecimal nightlyPrice(BigDecimal base, LocalDate date) {
        BigDecimal multiplier = BigDecimal.ONE;

        if (isWeekend(date))      multiplier = multiplier.add(WEEKEND_UPLIFT);
        if (isPeakSeason(date))   multiplier = multiplier.add(PEAK_UPLIFT);

        return base.multiply(multiplier).setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isWeekend(LocalDate date) {
        return switch (date.getDayOfWeek()) {
            case FRIDAY, SATURDAY -> true;
            default -> false;
        };
    }

    private boolean isPeakSeason(LocalDate date) {
        Month m = date.getMonth();
        return m == Month.JUNE || m == Month.JULY || m == Month.AUGUST || m == Month.DECEMBER;
    }
}
