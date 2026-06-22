package com.booksys.auditlog;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChangeLogRepository extends JpaRepository<ChangeLog, UUID> {

    List<ChangeLog> findTop200ByOrderByCreatedAtDesc();

    Page<ChangeLog> findByOrderByCreatedAtDesc(Pageable pageable);

    Page<ChangeLog> findByEntityTypeOrderByCreatedAtDesc(String entityType, Pageable pageable);

    List<ChangeLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, String entityId);
}
