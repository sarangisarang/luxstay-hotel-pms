package com.booksys.hotel;

import com.booksys.pricing.DynamicPricingService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DynamicPricingServiceTest {

    private final DynamicPricingService service = new DynamicPricingService();

    // Monday 2025-06-02 = weekday, peak season (June)
    private static final LocalDate PEAK_WEEKDAY  = LocalDate.of(2025, 6, 2);
    // Friday 2025-06-06 = weekend + peak
    private static final LocalDate PEAK_WEEKEND  = LocalDate.of(2025, 6, 6);
    // Tuesday 2025-03-04 = weekday, off-peak
    private static final LocalDate OFF_WEEKDAY   = LocalDate.of(2025, 3, 4);
    // Saturday 2025-03-08 = weekend, off-peak
    private static final LocalDate OFF_WEEKEND   = LocalDate.of(2025, 3, 8);

    @Test
    void offPeakWeekdayAppliesNoUplift() {
        BigDecimal base  = new BigDecimal("100.00");
        BigDecimal price = service.nightlyPrice(base, OFF_WEEKDAY);
        assertThat(price).isEqualByComparingTo("100.00");
    }

    @Test
    void offPeakWeekendApplies30PctUplift() {
        BigDecimal base  = new BigDecimal("100.00");
        BigDecimal price = service.nightlyPrice(base, OFF_WEEKEND);
        assertThat(price).isEqualByComparingTo("130.00");
    }

    @Test
    void peakWeekdayApplies25PctUplift() {
        BigDecimal base  = new BigDecimal("100.00");
        BigDecimal price = service.nightlyPrice(base, PEAK_WEEKDAY);
        assertThat(price).isEqualByComparingTo("125.00");
    }

    @Test
    void peakWeekendApplies55PctUplift() {
        BigDecimal base  = new BigDecimal("100.00");
        BigDecimal price = service.nightlyPrice(base, PEAK_WEEKEND);
        assertThat(price).isEqualByComparingTo("155.00");
    }

    @Test
    void calculateTotalSumsNightly() {
        // Mon–Wed = 2 off-peak weekday nights at €100 → €200
        BigDecimal total = service.calculateTotal(
                new BigDecimal("100.00"),
                LocalDate.of(2025, 3, 3),  // Monday
                LocalDate.of(2025, 3, 5)   // Wednesday (exclusive)
        );
        assertThat(total).isEqualByComparingTo("200.00");
    }

    @Test
    void calculateTotalWithWeekend() {
        // Fri + Sat = 2 off-peak weekend nights at €100 → 130 + 130 = 260
        BigDecimal total = service.calculateTotal(
                new BigDecimal("100.00"),
                LocalDate.of(2025, 3, 7),  // Friday
                LocalDate.of(2025, 3, 9)   // Sunday (exclusive)
        );
        assertThat(total).isEqualByComparingTo("260.00");
    }

    @Test
    void calculateTotalNullBaseReturnsZero() {
        BigDecimal total = service.calculateTotal(null, OFF_WEEKDAY, OFF_WEEKDAY.plusDays(1));
        assertThat(total).isEqualByComparingTo("0.00");
    }

    @Test
    void calculateTotalNullDatesReturnsZero() {
        BigDecimal total = service.calculateTotal(new BigDecimal("100.00"), null, null);
        assertThat(total).isEqualByComparingTo("0.00");
    }

    @Test
    void decemberIsPeakSeason() {
        BigDecimal base  = new BigDecimal("200.00");
        // Wednesday 2025-12-03 — weekday + peak
        BigDecimal price = service.nightlyPrice(base, LocalDate.of(2025, 12, 3));
        assertThat(price).isEqualByComparingTo("250.00");
    }
}
