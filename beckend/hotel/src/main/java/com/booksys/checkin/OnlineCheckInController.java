package com.booksys.checkin;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Set;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class OnlineCheckInController {

    private static final Set<BookingStatus> OPEN = EnumSet.of(BookingStatus.PENDING, BookingStatus.CONFIRMED);
    private static final char[] CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OnlineCheckInRepository repo;
    private final BookingRepository bookingRepository;

    /** What a guest may send; status, codes and timestamps are set by the server only. */
    public record CheckInRequest(
            UUID bookingId, String guestEmail, String guestFirstName, String guestLastName,
            String passportNumber, String nationality, String dateOfBirth, String address,
            String estimatedArrivalTime, String specialRequests,
            Boolean earlyCheckIn, Boolean lateCheckOut, Boolean extraBed, Boolean airportTransfer) {}

    /**
     * Public — guest submits self check-in. The booking must exist, belong to
     * the given e-mail address and still be open. (It used to accept any
     * booking ID — or a made-up one — and the client could set the status.)
     */
    @PostMapping("/api/public/online-checkin")
    public ResponseEntity<?> submit(@RequestBody CheckInRequest req) {
        if (req == null || req.bookingId() == null || isBlank(req.guestEmail())
                || isBlank(req.guestFirstName()) || isBlank(req.guestLastName())) {
            throw new IllegalArgumentException("Booking reference, name and e-mail are required");
        }
        String email = req.guestEmail().trim();
        Booking booking = bookingRepository.findById(req.bookingId())
                .filter(b -> b.getGuest() != null && b.getGuest().getEmail() != null
                        && b.getGuest().getEmail().trim().equalsIgnoreCase(email))
                // one message for "no such booking" and "wrong e-mail": no probing
                .orElseThrow(() -> new IllegalArgumentException("No booking matches this reference and e-mail address"));
        if (!OPEN.contains(booking.getBookingStatus())
                || booking.getCheckOutDate() == null || booking.getCheckOutDate().isBefore(LocalDate.now())) {
            throw new IllegalStateException("Online check-in is not available for this booking");
        }

        OnlineCheckIn c = repo.findFirstByBookingIdOrderBySubmittedAtDesc(booking.getId()).orElseGet(OnlineCheckIn::new);
        if (c.getStatus() == CheckInStatus.APPROVED) {
            throw new IllegalStateException("Online check-in for this booking has already been approved");
        }
        c.setBookingId(booking.getId());
        c.setGuestEmail(limit(email, 254));
        c.setGuestFirstName(limit(req.guestFirstName(), 100));
        c.setGuestLastName(limit(req.guestLastName(), 100));
        c.setPassportNumber(limit(req.passportNumber(), 40));
        c.setNationality(limit(req.nationality(), 60));
        c.setDateOfBirth(limit(req.dateOfBirth(), 20));
        c.setAddress(limit(req.address(), 300));
        c.setEstimatedArrivalTime(limit(req.estimatedArrivalTime(), 20));
        c.setSpecialRequests(limit(req.specialRequests(), 1000));
        c.setEarlyCheckIn(Boolean.TRUE.equals(req.earlyCheckIn()));
        c.setLateCheckOut(Boolean.TRUE.equals(req.lateCheckOut()));
        c.setExtraBed(Boolean.TRUE.equals(req.extraBed()));
        c.setAirportTransfer(Boolean.TRUE.equals(req.airportTransfer()));
        c.setStatus(CheckInStatus.SUBMITTED);
        c.setProcessedAt(null);
        if (c.getConfirmationCode() == null) {
            c.setConfirmationCode(newCode());
        }
        OnlineCheckIn saved = repo.save(c);
        return ResponseEntity.ok(Map.of(
                "id",               saved.getId(),
                "confirmationCode", saved.getConfirmationCode(),
                "status",           saved.getStatus()
        ));
    }

    /**
     * Public — status of one check-in, by e-mail AND confirmation code (the
     * e-mail alone used to list every check-in of that address with booking IDs).
     */
    @GetMapping("/api/public/online-checkin/status")
    public ResponseEntity<?> publicStatus(@RequestParam String email, @RequestParam String code) {
        String normalizedCode = code == null ? "" : code.trim().toUpperCase(java.util.Locale.ROOT);
        List<OnlineCheckIn> found = repo.findByConfirmationCode(normalizedCode)
                .filter(c -> email != null && c.getGuestEmail() != null
                        && c.getGuestEmail().trim().equalsIgnoreCase(email.trim()))
                .stream().toList();
        return ResponseEntity.ok(found.stream().map(c -> Map.of(
                "id",               c.getId(),
                "status",           c.getStatus(),
                "confirmationCode", c.getConfirmationCode(),
                "submittedAt",      c.getSubmittedAt() != null ? c.getSubmittedAt().toString() : ""
        )).toList());
    }

    private static String newCode() {
        StringBuilder sb = new StringBuilder("OCI-");
        for (int i = 0; i < 8; i++) sb.append(CODE_ALPHABET[RANDOM.nextInt(CODE_ALPHABET.length)]);
        return sb.toString();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String limit(String s, int max) {
        if (s == null || s.isBlank()) return null;
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
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
