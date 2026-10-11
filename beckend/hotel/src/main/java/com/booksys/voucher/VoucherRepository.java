package com.booksys.voucher;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface VoucherRepository extends JpaRepository<Voucher, UUID> {
    Optional<Voucher> findByCodeIgnoreCase(String code);

    /**
     * Atomically counts one use when the limit allows it.
     *
     * @return 1 when the use was counted, 0 when the limit was already reached
     */
    @Modifying
    @Query("update Voucher v set v.usedCount = coalesce(v.usedCount, 0) + 1 " +
           "where v.id = :id and (v.usageLimit is null or coalesce(v.usedCount, 0) < v.usageLimit)")
    int incrementUsageIfAvailable(@Param("id") UUID id);
}
