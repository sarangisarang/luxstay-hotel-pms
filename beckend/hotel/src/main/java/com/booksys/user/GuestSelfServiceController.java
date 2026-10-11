package com.booksys.user;

import com.booksys.booking.Booking;
import com.booksys.booking.GuestBookingService;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestDataExportService;
import com.booksys.loyalty.GuestLoyalty;
import com.booksys.loyalty.GuestLoyaltyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Self-service for logged-in guest accounts (role USER). Everything is scoped
 * to the caller's own guest profile on the server; there is no ID or e-mail
 * parameter that could point at another guest. Replaces the guest pages'
 * use of {@code /api/public/bookings/my-bookings?email=} and
 * {@code /api/loyalty/email/{email}}.
 */
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class GuestSelfServiceController {

    private final CurrentUser currentUser;
    private final GuestBookingService guestBookingService;
    private final GuestLoyaltyRepository loyaltyRepository;
    private final GuestDataExportService dataExportService;

    /** My bookings, newest stay first. */
    @GetMapping("/bookings")
    public List<GuestBookingService.GuestBookingView> myBookings() {
        return guestBookingService.myBookings();
    }

    /** Cancels one of my bookings (until the arrival day). */
    @PostMapping("/bookings/{id}/cancel")
    public GuestBookingService.GuestBookingView cancel(@PathVariable UUID id) {
        Booking booking = guestBookingService.requireMyBooking(id);
        return guestBookingService.cancelAsGuest(booking);
    }

    /** My loyalty status; empty object when I have no loyalty record yet. */
    @GetMapping("/loyalty")
    public Map<String, Object> myLoyalty() {
        Guest guest = currentUser.requireGuest();
        GuestLoyalty l = loyaltyRepository.findByGuestId(guest.getId()).orElse(null);
        Map<String, Object> result = new LinkedHashMap<>();
        if (l != null) {
            result.put("points", l.getPoints());
            result.put("tier", l.getTier());
            result.put("totalStays", l.getTotalStays());
            result.put("totalSpent", l.getTotalSpent());
        }
        return result;
    }

    /** Download of all my personal data (DSGVO Art. 15 / 20). */
    @GetMapping("/data-export")
    public ResponseEntity<Map<String, Object>> myData() {
        Guest guest = currentUser.requireGuest();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"my-data.json\"")
                .body(dataExportService.export(guest.getId()));
    }
}
