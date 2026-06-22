package com.booksys.auditlog;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "change_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChangeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** e.g. "Booking", "Payment", "Room", "Guest" */
    @Column(nullable = false)
    private String entityType;

    @Column(nullable = false)
    private String entityId;

    /** CREATE, UPDATE, DELETE, STATUS_CHANGE */
    @Column(nullable = false)
    private String action;

    private String performedBy;
    private String performedByRole;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String oldValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
