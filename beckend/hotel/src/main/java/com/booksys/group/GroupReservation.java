package com.booksys.group;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_reservations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String groupName;

    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private String company;
    private String occasion;             // CORPORATE, WEDDING, CONFERENCE, TOUR_GROUP, OTHER

    @Column(nullable = false)
    private LocalDate checkInDate;

    @Column(nullable = false)
    private LocalDate checkOutDate;

    @Column(nullable = false)
    private Integer roomCount;

    private String roomTypeId;
    private String hotelId;

    private BigDecimal agreedRate;
    private String currency;
    private Boolean breakfastIncluded;
    private Boolean transferIncluded;
    private String mealPlan;            // NONE, BB, HB, FB, AI

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GroupStatus status;

    @Column(columnDefinition = "TEXT")
    private String specialRequirements;

    @Column(columnDefinition = "TEXT")
    private String internalNotes;

    private String paymentTerms;
    private BigDecimal depositAmount;
    private Boolean depositPaid;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private String createdBy;
}
