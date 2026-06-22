package com.booksys.pos;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "room_charges")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomCharge {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID bookingId;

    @Column(nullable = false)
    private Integer roomNumber;

    @Column(nullable = false)
    private String guestName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChargeCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChargeStatus status;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    private Integer quantity;

    private String staffMember;

    @Column(nullable = false)
    private LocalDateTime chargedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
