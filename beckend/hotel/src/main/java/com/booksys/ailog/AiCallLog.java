package com.booksys.ailog;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_call_log", indexes = {
        @Index(name = "idx_ailog_endpoint", columnList = "endpoint"),
        @Index(name = "idx_ailog_created",  columnList = "created_at"),
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AiCallLog {

    @Id
    @GeneratedValue
    private UUID id;

    private String endpoint;       // e.g. "guest-chat", "insights/dashboard"
    private String sessionId;

    @Column(columnDefinition = "TEXT")
    private String userMessage;

    @Column(columnDefinition = "TEXT")
    private String aiResponse;

    private boolean usedClaude;    // false = fell back to rule-based
    private boolean usedRag;       // true = KB entries were injected
    private int     ragHits;       // how many KB entries matched
    private long    latencyMs;
    private int     retryCount;
    private boolean handoffTriggered;
    private String  confidenceLevel; // HIGH | MEDIUM | LOW

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
