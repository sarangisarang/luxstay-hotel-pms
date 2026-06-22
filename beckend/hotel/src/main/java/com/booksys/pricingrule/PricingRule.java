package com.booksys.pricingrule;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pricing_rules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PricingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PricingRuleType type;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private Boolean active;

    @Column(nullable = false)
    private Integer priority;

    @Column(precision = 6, scale = 2)
    private BigDecimal adjustmentPercent;

    @Column(precision = 10, scale = 2)
    private BigDecimal adjustmentFixed;

    private LocalDate validFrom;
    private LocalDate validTo;

    private Integer conditionMinNights;
    private Integer conditionDaysBeforeArrival;
    private Integer conditionOccupancyPctMin;
    private Integer conditionOccupancyPctMax;

    private String applyToRoomTypeId;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
