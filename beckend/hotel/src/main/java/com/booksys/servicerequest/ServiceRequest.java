package com.booksys.servicerequest;

import com.booksys.booking.Booking;
import com.booksys.guest.Guest;
import com.booksys.service.ServiceEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceRequest {

    @Id
    @GeneratedValue
    private UUID id; // UUID auto-generated for H2 using Hibernate

    private String description;

    private LocalDateTime requestDate; // Date and time when the service request was made

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "guest_id", nullable = false)
    private Guest guest; // The guest who made the request

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ServiceEntity service; // The service being requested

    @ManyToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Enumerated(EnumType.STRING)
    private ServiceRequestStatus status; // Status of the request (e.g., PENDING, COMPLETED, CANCELLED)

    @PrePersist
    public void prePersist() {
        this.requestDate = LocalDateTime.now();
        if (this.status == null) {
            this.status = ServiceRequestStatus.PENDING;
        }
    }
}