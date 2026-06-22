package com.booksys.voucher;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vouchers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;                  // e.g. SUMMER2026

    @Column(nullable = false)
    private String name;                  // Display name

    @Enumerated(EnumType.STRING)
    private DiscountType discountType;    // PERCENTAGE or FIXED

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;     // e.g. 15 (%) or 50 (€)

    private BigDecimal maxDiscountAmount; // cap for percentage discounts

    private Integer usageLimit;           // null = unlimited
    private Integer usedCount;

    private LocalDate validFrom;
    private LocalDate validTo;

    private Boolean active;
    private String hotelId;              // null = all hotels
    private String roomTypeId;           // null = all room types

    private Integer minNights;           // minimum stay to apply

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private String createdBy;
}
