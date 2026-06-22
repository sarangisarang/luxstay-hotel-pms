package com.booksys.channel;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "channel_reservations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChannelType channel;

    @Column(nullable = false)
    private String externalReservationId;

    @Column(nullable = false)
    private String guestName;

    private String guestEmail;
    private String guestPhone;

    @Column(nullable = false)
    private LocalDate checkIn;

    @Column(nullable = false)
    private LocalDate checkOut;

    private Integer roomNumber;
    private String roomTypeName;

    @Column(precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(precision = 5, scale = 2)
    private BigDecimal commissionAmount;

    private String status;
    private String notes;

    private UUID linkedBookingId;

    @CreationTimestamp
    private LocalDateTime receivedAt;
}
