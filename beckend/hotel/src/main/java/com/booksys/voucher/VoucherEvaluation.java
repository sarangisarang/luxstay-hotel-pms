package com.booksys.voucher;

import java.math.BigDecimal;

/**
 * Result of checking a voucher code against a concrete stay.
 *
 * @param valid    whether the voucher can be applied
 * @param reason   human-readable reason when {@code valid} is false, otherwise {@code null}
 * @param voucher  the matched voucher, or {@code null} when the code does not exist
 * @param discount discount amount in the booking currency (zero when not valid)
 */
public record VoucherEvaluation(boolean valid, String reason, Voucher voucher, BigDecimal discount) {

    /** Convenience factory for a rejected code. */
    public static VoucherEvaluation rejected(String reason, Voucher voucher) {
        return new VoucherEvaluation(false, reason, voucher, BigDecimal.ZERO);
    }
}
