package com.booksys.loyalty;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "guest_loyalty")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GuestLoyalty {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID guestId;

    @Column(nullable = false)
    private String guestEmail;

    @Column(nullable = false)
    private String guestName;

    @Column(nullable = false)
    private Integer points;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoyaltyTier tier;

    @Column(nullable = false)
    private Integer totalStays;

    @Column(nullable = false, precision = 12, scale = 2)
    private java.math.BigDecimal totalSpent;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
