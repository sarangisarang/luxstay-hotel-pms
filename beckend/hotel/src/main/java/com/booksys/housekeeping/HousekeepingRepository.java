package com.booksys.housekeeping;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface HousekeepingRepository extends JpaRepository<HousekeepingTask, UUID> {

    List<HousekeepingTask> findByStatus(HousekeepingStatus status);

    List<HousekeepingTask> findByAssignedTo(String assignedTo);

    List<HousekeepingTask> findByRoomId(String roomId);

    @Query("SELECT h FROM HousekeepingTask h WHERE h.scheduledAt BETWEEN :from AND :to")
    List<HousekeepingTask> findByScheduledAtBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("SELECT h FROM HousekeepingTask h WHERE h.status IN ('PENDING','IN_PROGRESS') ORDER BY h.priority DESC, h.scheduledAt ASC")
    List<HousekeepingTask> findActiveTasks();

    long countByStatus(HousekeepingStatus status);
    long countByStatusIn(java.util.Collection<HousekeepingStatus> statuses);
}
