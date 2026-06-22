package com.booksys.checkin;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "online_checkins")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OnlineCheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID bookingId;

    @Column(nullable = false)
    private String guestEmail;

    @Column(nullable = false)
    private String guestFirstName;

    @Column(nullable = false)
    private String guestLastName;

    private String passportNumber;
    private String nationality;
    private String dateOfBirth;
    private String address;
    private String estimatedArrivalTime;

    private String specialRequests;
    private Boolean earlyCheckIn;
    private Boolean lateCheckOut;
    private Boolean extraBed;
    private Boolean airportTransfer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CheckInStatus status;

    private String confirmationCode;

    @CreationTimestamp
    private LocalDateTime submittedAt;

    private LocalDateTime processedAt;
}
