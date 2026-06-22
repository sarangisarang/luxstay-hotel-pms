package com.booksys.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<AppNotification, UUID> {

    List<AppNotification> findTop100ByOrderByCreatedAtDesc();

    @Query("SELECT n FROM AppNotification n WHERE (n.recipientRole IS NULL OR n.recipientRole = :role) ORDER BY n.createdAt DESC LIMIT 100")
    List<AppNotification> findTop100ForRole(@Param("role") String role);

    @Query("SELECT n FROM AppNotification n WHERE (n.recipientRole IS NULL OR n.recipientRole = :role) ORDER BY n.createdAt DESC")
    Page<AppNotification> findPageForRole(@Param("role") String role, Pageable pageable);

    @Query("SELECT COUNT(n) FROM AppNotification n WHERE n.read = false AND (n.recipientRole IS NULL OR n.recipientRole = :role)")
    long countUnreadForRole(@Param("role") String role);

    long countByReadFalse();

    @Modifying
    @Query("UPDATE AppNotification n SET n.read = true WHERE n.read = false")
    void markAllAsRead();

    @Modifying
    @Query("UPDATE AppNotification n SET n.read = true WHERE n.read = false AND (n.recipientRole IS NULL OR n.recipientRole = :role)")
    void markAllAsReadForRole(@Param("role") String role);
}
