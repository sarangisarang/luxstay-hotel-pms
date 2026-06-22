package com.booksys.chatmemory;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_memory", indexes = {
        @Index(name = "idx_chat_session", columnList = "session_id"),
        @Index(name = "idx_chat_created", columnList = "created_at"),
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMemory {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String role; // "user" | "assistant"

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    private String guestName;
    private boolean handoffRequested;
}
