package com.booksys.concierge;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "concierge_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConciergeRequest {

    @Id
    @GeneratedValue
    private UUID id;

    private UUID bookingId;
    private UUID guestId;
    private String guestName;
    private Integer roomNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConciergeType type;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ConciergeStatus status = ConciergeStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String assignedTo;

    private LocalDateTime requestedFor;

    @Column(columnDefinition = "TEXT")
    private String staffNotes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (status == ConciergeStatus.COMPLETED && completedAt == null) {
            completedAt = LocalDateTime.now();
        }
    }
}
