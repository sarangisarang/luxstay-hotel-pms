package com.booksys.pos;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pos")
@RequiredArgsConstructor
public class PosController {

    private final RoomChargeRepository repo;

    @GetMapping
    public List<RoomCharge> getAll() {
        return repo.findAll();
    }

    @GetMapping("/booking/{bookingId}")
    public List<RoomCharge> byBooking(@PathVariable UUID bookingId) {
        return repo.findByBookingIdOrderByChargedAtDesc(bookingId);
    }

    @GetMapping("/room/{roomNumber}")
    public List<RoomCharge> byRoom(@PathVariable Integer roomNumber) {
        return repo.findByRoomNumberOrderByChargedAtDesc(roomNumber);
    }

    @GetMapping("/booking/{bookingId}/total")
    public ResponseEntity<?> total(@PathVariable UUID bookingId) {
        BigDecimal total = repo.totalForBooking(bookingId);
        return ResponseEntity.ok(Map.of("bookingId", bookingId, "total", total != null ? total : BigDecimal.ZERO));
    }

    @PostMapping
    public RoomCharge addCharge(@RequestBody RoomCharge charge) {
        charge.setId(null);
        if (charge.getStatus() == null) charge.setStatus(ChargeStatus.PENDING);
        if (charge.getChargedAt() == null) charge.setChargedAt(LocalDateTime.now());
        if (charge.getQuantity() == null) charge.setQuantity(1);
        return repo.save(charge);
    }

    @PatchMapping("/{id}/status")
    public RoomCharge updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        RoomCharge charge = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Charge not found: " + id));
        charge.setStatus(ChargeStatus.valueOf(body.get("status")));
        return repo.save(charge);
    }

    @PatchMapping("/{id}/void")
    public RoomCharge voidCharge(@PathVariable UUID id) {
        RoomCharge charge = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Charge not found: " + id));
        charge.setStatus(ChargeStatus.VOIDED);
        return repo.save(charge);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        long pending = repo.countByStatus(ChargeStatus.PENDING);
        BigDecimal totalPending = repo.findByStatus(ChargeStatus.PENDING).stream()
                .map(RoomCharge::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return ResponseEntity.ok(Map.of(
                "pendingCount", pending,
                "pendingAmount", totalPending,
                "totalCharges", repo.count()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
