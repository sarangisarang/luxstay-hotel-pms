package com.booksys.checkin;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class OnlineCheckInController {

    private final OnlineCheckInRepository repo;

    /* Public — guest submits self check-in */
    @PostMapping("/api/public/online-checkin")
    public ResponseEntity<?> submit(@RequestBody OnlineCheckIn req) {
        req.setId(null);
        req.setStatus(CheckInStatus.SUBMITTED);
        req.setConfirmationCode("OCI-" + req.getBookingId().toString().substring(0, 6).toUpperCase());
        OnlineCheckIn saved = repo.save(req);
        return ResponseEntity.ok(Map.of(
                "id",               saved.getId(),
                "confirmationCode", saved.getConfirmationCode(),
                "status",           saved.getStatus()
        ));
    }

    @GetMapping("/api/public/online-checkin/status")
    public ResponseEntity<?> publicStatus(@RequestParam String email) {
        List<OnlineCheckIn> list = repo.findByGuestEmail(email);
        return ResponseEntity.ok(list.stream().map(c -> Map.of(
                "id",               c.getId(),
                "bookingId",        c.getBookingId(),
                "status",           c.getStatus(),
                "confirmationCode", c.getConfirmationCode() != null ? c.getConfirmationCode() : "",
                "submittedAt",      c.getSubmittedAt() != null ? c.getSubmittedAt().toString() : ""
        )).toList());
    }

    /* Staff — review submitted check-ins */
    @GetMapping("/api/checkins")
    public List<OnlineCheckIn> getAll() {
        return repo.findAll();
    }

    @GetMapping("/api/checkins/pending")
    public List<OnlineCheckIn> getPending() {
        return repo.findByStatus(CheckInStatus.SUBMITTED);
    }

    @PatchMapping("/api/checkins/{id}/approve")
    public OnlineCheckIn approve(@PathVariable UUID id) {
        OnlineCheckIn c = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Check-in not found: " + id));
        c.setStatus(CheckInStatus.APPROVED);
        c.setProcessedAt(LocalDateTime.now());
        return repo.save(c);
    }

    @PatchMapping("/api/checkins/{id}/reject")
    public OnlineCheckIn reject(@PathVariable UUID id) {
        OnlineCheckIn c = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Check-in not found: " + id));
        c.setStatus(CheckInStatus.REJECTED);
        c.setProcessedAt(LocalDateTime.now());
        return repo.save(c);
    }

    @GetMapping("/api/checkins/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(Map.of(
                "submitted", repo.countByStatus(CheckInStatus.SUBMITTED),
                "approved",  repo.countByStatus(CheckInStatus.APPROVED),
                "rejected",  repo.countByStatus(CheckInStatus.REJECTED),
                "total",     repo.count()
        ));
    }
}
