package com.booksys.knowledge;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "knowledge_base", indexes = {
        @Index(name = "idx_kb_category", columnList = "category"),
        @Index(name = "idx_kb_active",   columnList = "active"),
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class KnowledgeEntry {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String category; // FAQ | POLICY | ROOM_INFO | PROCEDURE | PROMOTION

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    private String tags; // comma-separated keywords

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private int priority = 0; // higher = returned first

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now(); }
}
