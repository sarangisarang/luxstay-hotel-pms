package com.booksys.concierge;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/concierge")
@RequiredArgsConstructor
public class ConciergeController {

    private final ConciergeRepository repo;

    @GetMapping
    public ResponseEntity<List<ConciergeRequest>> getAll(
            @RequestParam(required = false) ConciergeStatus status) {
        if (status != null) return ResponseEntity.ok(repo.findByStatusOrderByCreatedAtDesc(status));
        return ResponseEntity.ok(repo.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        Map<String, Object> m = new LinkedHashMap<>();
        for (ConciergeStatus s : ConciergeStatus.values()) m.put(s.name().toLowerCase(), repo.countByStatus(s));
        m.put("total", repo.count());
        return ResponseEntity.ok(m);
    }

    @GetMapping("/guest/{guestId}")
    public ResponseEntity<List<ConciergeRequest>> byGuest(@PathVariable UUID guestId) {
        return ResponseEntity.ok(repo.findByGuestIdOrderByCreatedAtDesc(guestId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConciergeRequest> getById(@PathVariable UUID id) {
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ConciergeRequest> create(@RequestBody ConciergeRequest req) {
        req.setId(null);
        req.setStatus(ConciergeStatus.PENDING);
        return ResponseEntity.ok(repo.save(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ConciergeRequest> update(@PathVariable UUID id, @RequestBody ConciergeRequest req) {
        return repo.findById(id).map(existing -> {
            req.setId(id);
            req.setCreatedAt(existing.getCreatedAt());
            return ResponseEntity.ok(repo.save(req));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ConciergeRequest> patchStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        return repo.findById(id).map(req -> {
            req.setStatus(ConciergeStatus.valueOf(body.get("status")));
            if (body.containsKey("assignedTo")) req.setAssignedTo(body.get("assignedTo"));
            if (body.containsKey("staffNotes")) req.setStaffNotes(body.get("staffNotes"));
            return ResponseEntity.ok(repo.save(req));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
