package com.booksys.channel;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/channels")
@RequiredArgsConstructor
public class ChannelController {

    private final ChannelListingRepository listingRepo;
    private final ChannelReservationRepository reservationRepo;

    /* ─── Listings ─── */

    @GetMapping("/listings")
    public List<ChannelListing> allListings() {
        return listingRepo.findAll();
    }

    @PostMapping("/listings")
    public ChannelListing createListing(@RequestBody ChannelListing listing) {
        listing.setId(null);
        if (listing.getStatus() == null) listing.setStatus(ChannelStatus.ACTIVE);
        if (listing.getInstantBook() == null) listing.setInstantBook(true);
        return listingRepo.save(listing);
    }

    @PutMapping("/listings/{id}")
    public ChannelListing updateListing(@PathVariable UUID id, @RequestBody ChannelListing body) {
        ChannelListing l = listingRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Listing not found"));
        if (body.getStatus() != null) l.setStatus(body.getStatus());
        if (body.getChannelRate() != null) l.setChannelRate(body.getChannelRate());
        if (body.getCommissionPct() != null) l.setCommissionPct(body.getCommissionPct());
        if (body.getMinNights() != null) l.setMinNights(body.getMinNights());
        if (body.getMaxNights() != null) l.setMaxNights(body.getMaxNights());
        if (body.getInstantBook() != null) l.setInstantBook(body.getInstantBook());
        return listingRepo.save(l);
    }

    @PostMapping("/listings/{id}/sync")
    public ChannelListing syncListing(@PathVariable UUID id) {
        ChannelListing l = listingRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Listing not found"));
        l.setLastSyncAt(LocalDateTime.now());
        l.setStatus(ChannelStatus.ACTIVE);
        return listingRepo.save(l);
    }

    @DeleteMapping("/listings/{id}")
    public ResponseEntity<Void> deleteListing(@PathVariable UUID id) {
        listingRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /* ─── Incoming Reservations ─── */

    @GetMapping("/reservations")
    public List<ChannelReservation> allReservations() {
        return reservationRepo.findAllByOrderByReceivedAtDesc();
    }

    @GetMapping("/reservations/channel/{channel}")
    public List<ChannelReservation> byChannel(@PathVariable ChannelType channel) {
        return reservationRepo.findByChannel(channel);
    }

    @PostMapping("/reservations")
    public ChannelReservation receiveReservation(@RequestBody ChannelReservation res) {
        res.setId(null);
        if (res.getStatus() == null) res.setStatus("NEW");
        return reservationRepo.save(res);
    }

    @PatchMapping("/reservations/{id}/confirm")
    public ChannelReservation confirmReservation(@PathVariable UUID id,
                                                  @RequestBody Map<String, String> body) {
        ChannelReservation res = reservationRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found"));
        res.setStatus("CONFIRMED");
        if (body.containsKey("linkedBookingId")) {
            res.setLinkedBookingId(UUID.fromString(body.get("linkedBookingId")));
        }
        return reservationRepo.save(res);
    }

    @PatchMapping("/reservations/{id}/cancel")
    public ChannelReservation cancelReservation(@PathVariable UUID id) {
        ChannelReservation res = reservationRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Reservation not found"));
        res.setStatus("CANCELLED");
        return reservationRepo.save(res);
    }

    /* ─── Stats ─── */

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalListings",      listingRepo.count());
        result.put("activeListings",     listingRepo.countByStatus(ChannelStatus.ACTIVE));
        result.put("totalReservations",  reservationRepo.count());

        Map<String, Long> byChannel = new LinkedHashMap<>();
        for (ChannelType ct : ChannelType.values()) {
            long cnt = listingRepo.countByChannel(ct);
            if (cnt > 0) byChannel.put(ct.name(), cnt);
        }
        result.put("listingsByChannel", byChannel);

        BigDecimal totalCommissions = reservationRepo.sumCommissions();
        result.put("totalCommissions", totalCommissions);

        return ResponseEntity.ok(result);
    }
}
