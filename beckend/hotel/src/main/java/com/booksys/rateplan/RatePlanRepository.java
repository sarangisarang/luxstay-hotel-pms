package com.booksys.rateplan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RatePlanRepository extends JpaRepository<RatePlan, UUID> {

    List<RatePlan> findByActive(Boolean active);

    List<RatePlan> findByType(RatePlanType type);

    @Query("SELECT r FROM RatePlan r WHERE r.active = true AND " +
           "(r.validFrom IS NULL OR r.validFrom <= :date) AND " +
           "(r.validTo IS NULL OR r.validTo >= :date)")
    List<RatePlan> findActiveForDate(@Param("date") LocalDate date);

    @Query("SELECT r FROM RatePlan r WHERE r.active = true AND " +
           "(r.minNights IS NULL OR r.minNights <= :nights) AND " +
           "(r.validFrom IS NULL OR r.validFrom <= :checkIn) AND " +
           "(r.validTo IS NULL OR r.validTo >= :checkIn) " +
           "ORDER BY r.discountPercent DESC")
    List<RatePlan> findApplicable(@Param("checkIn") LocalDate checkIn, @Param("nights") int nights);
}
