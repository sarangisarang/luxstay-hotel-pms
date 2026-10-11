package com.booksys.notification;

import com.booksys.common.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository repo;
    private final NotificationService service;

    private String resolveRole(Authentication auth) {
        if (auth == null) return null;
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .findFirst().orElse(null);
    }

    @GetMapping
    public PageResponse<AppNotification> getAll(
            Authentication auth,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        String role = resolveRole(auth);
        if (role == null) return PageResponse.of(org.springframework.data.domain.Page.empty());
        size = Math.min(size, 100);
        return PageResponse.of(repo.findPageForRole(
                role, PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Authentication auth) {
        String role = resolveRole(auth);
        long count = role != null ? repo.countUnreadForRole(role) : 0L;
        return Map.of("count", count);
    }

    /** Marks one notification read — only one addressed to the caller's role. */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable UUID id, Authentication auth) {
        String role = resolveRole(auth);
        repo.findById(id)
                .filter(n -> n.getRecipientRole() == null || n.getRecipientRole().equals(role))
                .ifPresent(n -> {
                    n.setRead(true);
                    repo.save(n);
                });
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mark-all-read")
    @Transactional
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        String role = resolveRole(auth);
        if (role != null) {
            repo.markAllAsReadForRole(role);
        }
        return ResponseEntity.noContent().build();
    }
}
