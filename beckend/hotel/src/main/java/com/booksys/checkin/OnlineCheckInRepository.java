package com.booksys.checkin;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OnlineCheckInRepository extends JpaRepository<OnlineCheckIn, UUID> {
    List<OnlineCheckIn> findByGuestEmail(String email);
    Optional<OnlineCheckIn> findByBookingId(UUID bookingId);
    List<OnlineCheckIn> findByStatus(CheckInStatus status);
    Optional<OnlineCheckIn> findByConfirmationCode(String code);
    long countByStatus(CheckInStatus status);
}
