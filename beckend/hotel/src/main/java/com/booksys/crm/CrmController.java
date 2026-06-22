package com.booksys.crm;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.email.EmailService;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/crm")
@RequiredArgsConstructor
public class CrmController {

    private final GuestCommunicationRepository commRepo;
    private final EmailCampaignRepository campaignRepo;
    private final GuestRepository guestRepo;
    private final BookingRepository bookingRepo;
    private final EmailService emailService;

    /* ─── Guest 360° Profile ─── */

    @GetMapping("/guests/{guestId}/profile")
    public ResponseEntity<?> guestProfile(@PathVariable UUID guestId) {
        Guest guest = guestRepo.findById(guestId)
                .orElseThrow(() -> new EntityNotFoundException("Guest not found"));

        List<Booking> bookings = bookingRepo.findByGuestEmail(guest.getEmail());
        List<GuestCommunication> comms = commRepo.findByGuestIdOrderByContactedAtDesc(guestId);

        int totalStays   = (int) bookings.stream().filter(b -> "COMPLETED".equals(b.getBookingStatus() != null ? b.getBookingStatus().name() : "")).count();
        var totalSpent   = bookings.stream()
                .filter(b -> b.getTotalAmount() != null)
                .map(b -> b.getTotalAmount())
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id",           guest.getId());
        profile.put("firstName",    guest.getFirstName());
        profile.put("lastName",     guest.getLastName());
        profile.put("email",        guest.getEmail());
        profile.put("phone",        guest.getPhone());
        profile.put("totalStays",   totalStays);
        profile.put("totalBookings",bookings.size());
        profile.put("totalSpent",   totalSpent);
        profile.put("bookings",     bookings.stream().map(b -> Map.of(
                "id",       b.getId(),
                "checkIn",  b.getCheckInDate() != null ? b.getCheckInDate().toString() : "",
                "checkOut", b.getCheckOutDate() != null ? b.getCheckOutDate().toString() : "",
                "status",   b.getBookingStatus() != null ? b.getBookingStatus().name() : "",
                "amount",   b.getTotalAmount() != null ? b.getTotalAmount() : 0
        )).toList());
        profile.put("communications", comms);

        return ResponseEntity.ok(profile);
    }

    /* ─── Communications ─── */

    @GetMapping("/communications")
    public List<GuestCommunication> allComms() {
        return commRepo.findAll();
    }

    @GetMapping("/communications/guest/{guestId}")
    public List<GuestCommunication> byGuest(@PathVariable UUID guestId) {
        return commRepo.findByGuestIdOrderByContactedAtDesc(guestId);
    }

    @PostMapping("/communications")
    public GuestCommunication logComm(@RequestBody GuestCommunication comm) {
        comm.setId(null);
        if (comm.getContactedAt() == null) comm.setContactedAt(LocalDateTime.now());
        return commRepo.save(comm);
    }

    @DeleteMapping("/communications/{id}")
    public ResponseEntity<Void> deleteComm(@PathVariable UUID id) {
        commRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /* ─── Email Campaigns ─── */

    @GetMapping("/campaigns")
    public List<EmailCampaign> campaigns() {
        return campaignRepo.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping("/campaigns")
    public EmailCampaign createCampaign(@RequestBody EmailCampaign campaign) {
        campaign.setId(null);
        if (campaign.getStatus() == null) campaign.setStatus(CampaignStatus.DRAFT);
        return campaignRepo.save(campaign);
    }

    @PutMapping("/campaigns/{id}")
    public EmailCampaign updateCampaign(@PathVariable UUID id, @RequestBody EmailCampaign body) {
        EmailCampaign c = campaignRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Campaign not found"));
        if (body.getName() != null)     c.setName(body.getName());
        if (body.getSubject() != null)  c.setSubject(body.getSubject());
        if (body.getBodyHtml() != null) c.setBodyHtml(body.getBodyHtml());
        if (body.getTargetSegment() != null) c.setTargetSegment(body.getTargetSegment());
        if (body.getStatus() != null)   c.setStatus(body.getStatus());
        if (body.getScheduledAt() != null) c.setScheduledAt(body.getScheduledAt());
        return campaignRepo.save(c);
    }

    @PostMapping("/campaigns/{id}/send")
    public ResponseEntity<?> sendCampaign(@PathVariable UUID id) {
        EmailCampaign campaign = campaignRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Campaign not found"));

        List<Guest> recipients = guestRepo.findAll();

        int sent = 0;
        for (Guest g : recipients) {
            if (g.getEmail() == null || g.getEmail().isBlank()) continue;
            try {
                emailService.sendRaw(g.getEmail(),
                        g.getFirstName() + " " + g.getLastName(),
                        campaign.getSubject(),
                        campaign.getBodyHtml());
                sent++;
            } catch (Exception e) {
                log.warn("Campaign email failed for {}: {}", g.getEmail(), e.getMessage());
            }
        }

        campaign.setStatus(CampaignStatus.SENT);
        campaign.setSentAt(LocalDateTime.now());
        campaign.setRecipientCount(sent);
        campaignRepo.save(campaign);

        return ResponseEntity.ok(Map.of("sent", sent, "status", "SENT"));
    }

    @DeleteMapping("/campaigns/{id}")
    public ResponseEntity<Void> deleteCampaign(@PathVariable UUID id) {
        campaignRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /* ─── Guest segments ─── */

    @GetMapping("/segments")
    public ResponseEntity<?> segments() {
        long total   = guestRepo.count();
        long vip     = bookingRepo.findVipGuestEmails(3).size();
        return ResponseEntity.ok(Map.of(
                "totalGuests", total,
                "vipGuests",   vip,
                "newGuests",   total - vip
        ));
    }
}
