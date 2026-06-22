package com.booksys.corporate;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "corporate_accounts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorporateAccount {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String companyName;

    private String industry;
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private String address;
    private String city;
    private String country;
    private String vatNumber;
    private String contractNumber;

    /** Negotiated room rate for standard room */
    private BigDecimal negotiatedRate;
    private String currency;

    /** Discount percentage applied to rack rate */
    private BigDecimal discountPercent;

    /** Credit limit in account currency */
    private BigDecimal creditLimit;

    /** Current outstanding balance */
    private BigDecimal outstandingBalance;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CorporateStatus status = CorporateStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    private LocalDateTime contractStart;
    private LocalDateTime contractEnd;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (outstandingBalance == null) outstandingBalance = BigDecimal.ZERO;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
