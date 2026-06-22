package com.booksys.housekeeping;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "housekeeping_tasks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HousekeepingTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private Integer roomNumber;

    private String roomId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HousekeepingStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HousekeepingType type;

    @Enumerated(EnumType.STRING)
    private Priority priority;

    private String assignedTo;
    private String notes;

    @Column(nullable = false)
    private LocalDateTime scheduledAt;

    private LocalDateTime completedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
