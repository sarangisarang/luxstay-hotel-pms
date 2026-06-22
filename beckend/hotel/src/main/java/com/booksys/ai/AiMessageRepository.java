package com.booksys.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AiMessageRepository extends JpaRepository<AiMessage, UUID> {
    List<AiMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
    List<AiMessage> findByUserEmailOrderByCreatedAtDesc(String email);
}
