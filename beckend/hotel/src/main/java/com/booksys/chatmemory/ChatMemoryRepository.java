package com.booksys.chatmemory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ChatMemoryRepository extends JpaRepository<ChatMemory, UUID> {

    List<ChatMemory> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    @Query("SELECT m FROM ChatMemory m WHERE m.sessionId = :sid ORDER BY m.createdAt DESC LIMIT :n")
    List<ChatMemory> findLastN(@Param("sid") String sessionId, @Param("n") int n);

    long countBySessionId(String sessionId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMemory m WHERE m.createdAt < :cutoff")
    void deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Transactional
    void deleteBySessionId(String sessionId);
}
