package com.booksys.voucher;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Voucher rules shared by the validate endpoint, the price quote and the booking.
 */
@ExtendWith(MockitoExtension.class)
class VoucherServiceTest {

    @Mock VoucherRepository repo;
    @InjectMocks VoucherService service;

    private Voucher voucher(DiscountType type, String value) {
        return Voucher.builder()
                .id(UUID.randomUUID())
                .code("SUMMER")
                .name("Summer deal")
                .discountType(type)
                .discountValue(new BigDecimal(value))
                .active(true)
                .usedCount(0)
                .build();
    }

    @Test
    void percentageVoucherIsCappedByMaxDiscount() {
        Voucher v = voucher(DiscountType.PERCENTAGE, "50");
        v.setMaxDiscountAmount(new BigDecimal("40.00"));
        when(repo.findByCodeIgnoreCase("summer")).thenReturn(Optional.of(v));

        VoucherEvaluation ev = service.evaluate("summer", new BigDecimal("200.00"), 2, null);

        assertThat(ev.valid()).isTrue();
        assertThat(ev.discount()).isEqualByComparingTo("40.00");
    }

    @Test
    void fixedVoucherNeverExceedsTheSubtotal() {
        Voucher v = voucher(DiscountType.FIXED, "500");
        when(repo.findByCodeIgnoreCase("SUMMER")).thenReturn(Optional.of(v));

        VoucherEvaluation ev = service.evaluate("SUMMER", new BigDecimal("120.00"), 1, null);

        assertThat(ev.discount()).isEqualByComparingTo("120.00");
    }

    @Test
    void unknownExpiredAndUsedUpVouchersAreRejected() {
        when(repo.findByCodeIgnoreCase("NOPE")).thenReturn(Optional.empty());
        assertThat(service.evaluate("NOPE", BigDecimal.TEN, 1, null).reason()).isEqualTo("Invalid voucher code");

        Voucher expired = voucher(DiscountType.FIXED, "10");
        expired.setValidTo(LocalDate.now().minusDays(1));
        when(repo.findByCodeIgnoreCase("OLD")).thenReturn(Optional.of(expired));
        assertThat(service.evaluate("OLD", BigDecimal.TEN, 1, null).valid()).isFalse();

        Voucher usedUp = voucher(DiscountType.FIXED, "10");
        usedUp.setUsageLimit(3);
        usedUp.setUsedCount(3);
        when(repo.findByCodeIgnoreCase("FULL")).thenReturn(Optional.of(usedUp));
        assertThat(service.evaluate("FULL", BigDecimal.TEN, 1, null).reason()).isEqualTo("Usage limit reached");
    }

    @Test
    void minimumStayAndRoomTypeRestrictionsApply() {
        Voucher v = voucher(DiscountType.FIXED, "10");
        v.setMinNights(3);
        UUID suite = UUID.randomUUID();
        v.setRoomTypeId(suite.toString());
        when(repo.findByCodeIgnoreCase("SUMMER")).thenReturn(Optional.of(v));

        assertThat(service.evaluate("SUMMER", BigDecimal.TEN, 2, suite).valid()).isFalse();
        assertThat(service.evaluate("SUMMER", BigDecimal.TEN, 3, UUID.randomUUID()).reason())
                .isEqualTo("Voucher is not valid for this room type");
        assertThat(service.evaluate("SUMMER", BigDecimal.TEN, 3, suite).valid()).isTrue();
    }

    @Test
    void redeemFailsWhenTheLastUseWasTakenConcurrently() {
        Voucher v = voucher(DiscountType.FIXED, "10");
        when(repo.incrementUsageIfAvailable(v.getId())).thenReturn(0);

        assertThatThrownBy(() -> service.redeem(v))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("usage limit");
    }
}
