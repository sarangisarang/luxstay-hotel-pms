package com.booksys.maintenance;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/maintenance")
@RequiredArgsConstructor
public class MaintenanceController {

    private final MaintenanceRepository repo;

    @GetMapping
    public List<MaintenanceRequest> getAll() {
        return repo.findAll();
    }

    @GetMapping("/open")
    public List<MaintenanceRequest> getOpen() {
        return repo.findOpenRequests();
    }

    @GetMapping("/status/{status}")
    public List<MaintenanceRequest> byStatus(@PathVariable MaintenanceStatus status) {
        return repo.findByStatus(status);
    }

    @GetMapping("/priority/{priority}")
    public List<MaintenanceRequest> byPriority(@PathVariable MaintenancePriority priority) {
        return repo.findByPriority(priority);
    }

    @GetMapping("/{id}")
    public MaintenanceRequest getOne(@PathVariable UUID id) {
        return repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Maintenance request not found: " + id));
    }

    @PostMapping
    public MaintenanceRequest create(@RequestBody MaintenanceRequest req) {
        req.setId(null);
        if (req.getStatus() == null) req.setStatus(MaintenanceStatus.OPEN);
        if (req.getPriority() == null) req.setPriority(MaintenancePriority.MEDIUM);
        if (req.getCategory() == null) req.setCategory(MaintenanceCategory.OTHER);
        if (req.getReportedAt() == null) req.setReportedAt(LocalDateTime.now());
        return repo.save(req);
    }

    @PutMapping("/{id}")
    public MaintenanceRequest update(@PathVariable UUID id, @RequestBody MaintenanceRequest body) {
        MaintenanceRequest req = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Maintenance request not found: " + id));
        if (body.getTitle() != null) req.setTitle(body.getTitle());
        if (body.getDescription() != null) req.setDescription(body.getDescription());
        if (body.getStatus() != null) req.setStatus(body.getStatus());
        if (body.getPriority() != null) req.setPriority(body.getPriority());
        if (body.getCategory() != null) req.setCategory(body.getCategory());
        if (body.getAssignedTo() != null) req.setAssignedTo(body.getAssignedTo());
        if (body.getResolutionNotes() != null) req.setResolutionNotes(body.getResolutionNotes());
        if (body.getResolvedAt() != null) req.setResolvedAt(body.getResolvedAt());
        return repo.save(req);
    }

    @PatchMapping("/{id}/status")
    public MaintenanceRequest updateStatus(@PathVariable UUID id,
                                            @RequestBody Map<String, String> body) {
        MaintenanceRequest req = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Maintenance request not found: " + id));
        MaintenanceStatus newStatus = MaintenanceStatus.valueOf(body.get("status"));
        req.setStatus(newStatus);
        if ((newStatus == MaintenanceStatus.RESOLVED || newStatus == MaintenanceStatus.CLOSED)
                && req.getResolvedAt() == null) {
            req.setResolvedAt(LocalDateTime.now());
        }
        if (body.containsKey("resolutionNotes")) {
            req.setResolutionNotes(body.get("resolutionNotes"));
        }
        return repo.save(req);
    }

    @PatchMapping("/{id}/assign")
    public MaintenanceRequest assign(@PathVariable UUID id,
                                      @RequestBody Map<String, String> body) {
        MaintenanceRequest req = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Maintenance request not found: " + id));
        req.setAssignedTo(body.get("assignedTo"));
        if (req.getStatus() == MaintenanceStatus.OPEN) {
            req.setStatus(MaintenanceStatus.IN_PROGRESS);
        }
        return repo.save(req);
    }

    @GetMapping("/stats")
    public Map<String, Long> stats() {
        return Map.of(
                "open",       repo.countByStatus(MaintenanceStatus.OPEN),
                "inProgress", repo.countByStatus(MaintenanceStatus.IN_PROGRESS),
                "onHold",     repo.countByStatus(MaintenanceStatus.ON_HOLD),
                "resolved",   repo.countByStatus(MaintenanceStatus.RESOLVED),
                "closed",     repo.countByStatus(MaintenanceStatus.CLOSED)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
