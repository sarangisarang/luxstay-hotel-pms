package com.booksys.maintenance;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface MaintenanceRepository extends JpaRepository<MaintenanceRequest, UUID> {

    List<MaintenanceRequest> findByStatus(MaintenanceStatus status);

    List<MaintenanceRequest> findByPriority(MaintenancePriority priority);

    List<MaintenanceRequest> findByCategory(MaintenanceCategory category);

    List<MaintenanceRequest> findByAssignedTo(String assignedTo);

    List<MaintenanceRequest> findByRoomId(String roomId);

    @Query("SELECT m FROM MaintenanceRequest m WHERE m.status IN ('OPEN','IN_PROGRESS','ON_HOLD') ORDER BY m.priority DESC, m.reportedAt ASC")
    List<MaintenanceRequest> findOpenRequests();

    long countByStatus(MaintenanceStatus status);
    long countByStatusIn(java.util.Collection<MaintenanceStatus> statuses);
}
