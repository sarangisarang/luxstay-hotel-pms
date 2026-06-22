package com.booksys.ai;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID sessionId;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false, length = 8000)
    private String content;

    private String userEmail;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
