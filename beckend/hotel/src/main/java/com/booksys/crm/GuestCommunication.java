package com.booksys.crm;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "guest_communications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GuestCommunication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID guestId;

    @Column(nullable = false)
    private String guestEmail;

    @Column(nullable = false)
    private String guestName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommunicationType type;

    @Column(nullable = false)
    private String subject;

    @Column(length = 4000)
    private String body;

    private String staffMember;

    @Column(nullable = false)
    private LocalDateTime contactedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
