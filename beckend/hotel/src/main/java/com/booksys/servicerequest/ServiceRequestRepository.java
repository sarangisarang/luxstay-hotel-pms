package com.booksys.servicerequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, UUID> {
    List<ServiceRequest> findByGuestId(UUID guestId);
    List<ServiceRequest> findByBookingId(UUID bookingId);
    long countByStatus(ServiceRequestStatus status);
    long countByStatusIn(java.util.Collection<ServiceRequestStatus> statuses);
}