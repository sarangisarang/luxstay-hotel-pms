package com.booksys.concierge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ConciergeRepository extends JpaRepository<ConciergeRequest, UUID> {
    List<ConciergeRequest> findByStatusOrderByCreatedAtDesc(ConciergeStatus status);
    List<ConciergeRequest> findByGuestIdOrderByCreatedAtDesc(UUID guestId);
    List<ConciergeRequest> findByBookingIdOrderByCreatedAtDesc(UUID bookingId);
    long countByStatus(ConciergeStatus status);
    List<ConciergeRequest> findAllByOrderByCreatedAtDesc();
}
