package com.booksys.voucher;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Single place where voucher rules live, so the public "validate" endpoint,
 * the price quote and the booking itself can never disagree about a discount.
 */
@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository repo;

    /**
     * Checks a voucher code against a stay and computes the discount.
     *
     * @param code       code entered by the guest (case-insensitive)
     * @param subtotal   amount the discount applies to (room + services)
     * @param nights     number of nights of the stay
     * @param roomTypeId room type of the stay, or {@code null} when unknown
     * @return evaluation with validity, reason and discount
     */
    public VoucherEvaluation evaluate(String code, BigDecimal subtotal, long nights, UUID roomTypeId) {
        if (code == null || code.isBlank()) {
            return VoucherEvaluation.rejected("No voucher code given", null);
        }
        Voucher v = repo.findByCodeIgnoreCase(code.trim()).orElse(null);
        if (v == null) {
            return VoucherEvaluation.rejected("Invalid voucher code", null);
        }
        if (Boolean.FALSE.equals(v.getActive())) {
            return VoucherEvaluation.rejected("Voucher is inactive", v);
        }
        LocalDate today = LocalDate.now();
        if (v.getValidFrom() != null && today.isBefore(v.getValidFrom())) {
            return VoucherEvaluation.rejected("Voucher not yet valid", v);
        }
        if (v.getValidTo() != null && today.isAfter(v.getValidTo())) {
            return VoucherEvaluation.rejected("Voucher has expired", v);
        }
        if (v.getUsageLimit() != null && v.getUsedCount() != null && v.getUsedCount() >= v.getUsageLimit()) {
            return VoucherEvaluation.rejected("Usage limit reached", v);
        }
        if (v.getMinNights() != null && nights < v.getMinNights()) {
            return VoucherEvaluation.rejected("Minimum stay of " + v.getMinNights() + " nights required", v);
        }
        // A voucher restricted to one room type must not discount another one
        if (v.getRoomTypeId() != null && !v.getRoomTypeId().isBlank()
                && (roomTypeId == null || !v.getRoomTypeId().equalsIgnoreCase(roomTypeId.toString()))) {
            return VoucherEvaluation.rejected("Voucher is not valid for this room type", v);
        }
        return new VoucherEvaluation(true, null, v, discountFor(v, subtotal));
    }

    /**
     * Counts one use of the voucher. The increment is a conditional UPDATE, so two
     * bookings racing for the last use cannot both get it.
     *
     * @throws IllegalStateException when the usage limit was reached in the meantime
     */
    @Transactional
    public void redeem(Voucher voucher) {
        if (repo.incrementUsageIfAvailable(voucher.getId()) == 0) {
            throw new IllegalStateException("Voucher usage limit reached");
        }
    }

    /** Discount for a valid voucher, never more than the subtotal itself. */
    static BigDecimal discountFor(Voucher v, BigDecimal subtotal) {
        BigDecimal base = subtotal == null ? BigDecimal.ZERO : subtotal;
        BigDecimal value = v.getDiscountValue() == null ? BigDecimal.ZERO : v.getDiscountValue();
        BigDecimal discount;
        if (v.getDiscountType() == DiscountType.PERCENTAGE) {
            discount = base.multiply(value).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (v.getMaxDiscountAmount() != null) {
                discount = discount.min(v.getMaxDiscountAmount());
            }
        } else {
            discount = value;
        }
        return discount.min(base).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }
}
