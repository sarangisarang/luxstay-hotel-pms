package com.booksys.pricingrule;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PricingRuleRepository extends JpaRepository<PricingRule, UUID> {
    List<PricingRule> findByActiveOrderByPriorityDesc(Boolean active);

    @Query("SELECT r FROM PricingRule r WHERE r.active = true AND " +
           "(r.validFrom IS NULL OR r.validFrom <= :date) AND " +
           "(r.validTo IS NULL OR r.validTo >= :date) " +
           "ORDER BY r.priority DESC")
    List<PricingRule> findActiveForDate(@Param("date") LocalDate date);
}
