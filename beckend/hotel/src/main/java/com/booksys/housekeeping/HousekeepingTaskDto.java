package com.booksys.housekeeping;

import java.time.LocalDateTime;
import java.util.UUID;

public record HousekeepingTaskDto(
        UUID id,
        Integer roomNumber,
        String roomId,
        HousekeepingStatus status,
        HousekeepingType type,
        Priority priority,
        String assignedTo,
        String notes,
        LocalDateTime scheduledAt,
        LocalDateTime completedAt,
        LocalDateTime createdAt
) {
    static HousekeepingTaskDto from(HousekeepingTask t) {
        return new HousekeepingTaskDto(
                t.getId(), t.getRoomNumber(), t.getRoomId(),
                t.getStatus(), t.getType(), t.getPriority(),
                t.getAssignedTo(), t.getNotes(),
                t.getScheduledAt(), t.getCompletedAt(), t.getCreatedAt()
        );
    }
}
