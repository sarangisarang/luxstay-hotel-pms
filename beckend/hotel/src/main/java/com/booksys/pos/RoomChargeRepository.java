package com.booksys.pos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface RoomChargeRepository extends JpaRepository<RoomCharge, UUID> {
    List<RoomCharge> findByBookingIdOrderByChargedAtDesc(UUID bookingId);
    List<RoomCharge> findByRoomNumberOrderByChargedAtDesc(Integer roomNumber);
    List<RoomCharge> findByStatus(ChargeStatus status);
    List<RoomCharge> findByCategory(ChargeCategory category);

    long countByStatus(ChargeStatus status);

    @Query("SELECT SUM(rc.amount) FROM RoomCharge rc WHERE rc.bookingId = :bookingId AND rc.status != 'VOIDED'")
    BigDecimal totalForBooking(UUID bookingId);
}
