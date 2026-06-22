package com.booksys.ailog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.UUID;

public interface AiCallLogRepository extends JpaRepository<AiCallLog, UUID> {

    @Query("SELECT a FROM AiCallLog a ORDER BY a.createdAt DESC LIMIT 100")
    List<AiCallLog> findRecent();

    @Query("SELECT COUNT(a) FROM AiCallLog a WHERE a.usedClaude = true")
    long countClaudeCalls();

    @Query("SELECT COUNT(a) FROM AiCallLog a WHERE a.handoffTriggered = true")
    long countHandoffs();

    @Query("SELECT AVG(a.latencyMs) FROM AiCallLog a WHERE a.usedClaude = true")
    Double avgLatencyMs();

    @Query("SELECT COUNT(a) FROM AiCallLog a WHERE a.usedRag = true")
    long countRagCalls();
}
