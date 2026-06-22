package com.booksys.group;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class GroupReservationController {

    private final GroupReservationRepository repo;

    @GetMapping
    public List<GroupReservation> all() {
        return repo.findAll();
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return Map.of(
            "total",       repo.count(),
            "enquiry",     repo.countByStatus(GroupStatus.ENQUIRY),
            "provisional", repo.countByStatus(GroupStatus.PROVISIONAL),
            "confirmed",   repo.countByStatus(GroupStatus.CONFIRMED),
            "cancelled",   repo.countByStatus(GroupStatus.CANCELLED),
            "completed",   repo.countByStatus(GroupStatus.COMPLETED)
        );
    }

    @GetMapping("/upcoming")
    public List<GroupReservation> upcoming() {
        LocalDate today = LocalDate.now();
        return repo.findInRange(today, today.plusDays(90));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupReservation> getOne(@PathVariable UUID id) {
        return repo.findById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<GroupReservation> create(
            @RequestBody GroupReservation g,
            Authentication auth) {
        if (g.getStatus() == null) g.setStatus(GroupStatus.ENQUIRY);
        if (auth != null) g.setCreatedBy(auth.getName());
        return ResponseEntity.ok(repo.save(g));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GroupReservation> update(
            @PathVariable UUID id,
            @RequestBody GroupReservation incoming) {
        return repo.findById(id).map(g -> {
            g.setGroupName(incoming.getGroupName());
            g.setContactName(incoming.getContactName());
            g.setContactEmail(incoming.getContactEmail());
            g.setContactPhone(incoming.getContactPhone());
            g.setCompany(incoming.getCompany());
            g.setOccasion(incoming.getOccasion());
            g.setCheckInDate(incoming.getCheckInDate());
            g.setCheckOutDate(incoming.getCheckOutDate());
            g.setRoomCount(incoming.getRoomCount());
            g.setRoomTypeId(incoming.getRoomTypeId());
            g.setHotelId(incoming.getHotelId());
            g.setAgreedRate(incoming.getAgreedRate());
            g.setCurrency(incoming.getCurrency());
            g.setBreakfastIncluded(incoming.getBreakfastIncluded());
            g.setTransferIncluded(incoming.getTransferIncluded());
            g.setMealPlan(incoming.getMealPlan());
            g.setStatus(incoming.getStatus() != null ? incoming.getStatus() : g.getStatus());
            g.setSpecialRequirements(incoming.getSpecialRequirements());
            g.setInternalNotes(incoming.getInternalNotes());
            g.setPaymentTerms(incoming.getPaymentTerms());
            g.setDepositAmount(incoming.getDepositAmount());
            g.setDepositPaid(incoming.getDepositPaid());
            return ResponseEntity.ok(repo.save(g));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<GroupReservation> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return repo.findById(id).map(g -> {
            try { g.setStatus(GroupStatus.valueOf(body.get("status"))); } catch (Exception ignored) {}
            return ResponseEntity.ok(repo.save(g));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
