package com.booksys.channel;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "channel_listings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelListing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String roomTypeId;

    private String roomTypeName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChannelType channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChannelStatus status;

    private String externalListingId;

    @Column(precision = 10, scale = 2)
    private BigDecimal channelRate;

    @Column(precision = 5, scale = 2)
    private BigDecimal commissionPct;

    private Integer minNights;
    private Integer maxNights;
    private Boolean instantBook;

    private LocalDateTime lastSyncAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
