package com.booksys.auditlog;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class ChangeLogService {

    private final ChangeLogRepository repo;

    public void log(String entityType, String entityId, String action,
                    String performedBy, String performedByRole,
                    String summary, String oldValue, String newValue) {
        repo.save(ChangeLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .performedBy(performedBy)
                .performedByRole(performedByRole)
                .summary(summary)
                .oldValue(oldValue)
                .newValue(newValue)
                .build());
    }
}
