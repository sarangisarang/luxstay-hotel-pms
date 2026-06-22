package com.booksys.employee;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "shift_schedules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID staffId;
    private String staffName;
    private String department;
    private String shiftStart;
    private String shiftEnd;
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ShiftStatus status = ShiftStatus.SCHEDULED;

    private String notes;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
