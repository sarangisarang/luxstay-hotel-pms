package com.booksys.auditlog;

import com.booksys.common.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@SuppressWarnings("null")
@RestController
@RequestMapping("/api/audit-log")
@RequiredArgsConstructor
public class ChangeLogController {

    private final ChangeLogRepository repo;

    @GetMapping
    public PageResponse<ChangeLog> getAll(
            @RequestParam(required = false) String entityType,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        size = Math.min(size, 200);
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (entityType != null && !entityType.isBlank()) {
            return PageResponse.of(repo.findByEntityTypeOrderByCreatedAtDesc(entityType, pageable));
        }
        return PageResponse.of(repo.findByOrderByCreatedAtDesc(pageable));
    }

    @GetMapping("/{entityType}/{entityId}")
    public List<ChangeLog> getForEntity(@PathVariable String entityType,
                                         @PathVariable String entityId) {
        return repo.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId);
    }

    @PostMapping
    public ChangeLog create(@RequestBody ChangeLog entry) {
        entry.setId(null);
        return repo.save(entry);
    }
}
