package com.booksys.webhook;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "webhook_deliveries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID subscriptionId;
    private String event;

    @Column(columnDefinition = "TEXT")
    private String payload;

    private Integer statusCode;

    @Column(columnDefinition = "TEXT")
    private String error;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime deliveredAt;
}
