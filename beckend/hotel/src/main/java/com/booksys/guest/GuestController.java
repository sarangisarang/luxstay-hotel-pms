package com.booksys.guest;
import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.loyalty.GuestLoyalty;
import com.booksys.loyalty.GuestLoyaltyRepository;
import lombok.RequiredArgsConstructor;
import com.booksys.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;


//GuestController exposes REST API endpoints for guest CRUD operations,
//using DTOs for consistent, clean data structures with the frontend.
@RestController
@RequestMapping("/api/guests")
@RequiredArgsConstructor

public class GuestController {

 private final GuestService guestService;
 private final BookingRepository bookingRepository;
 private final GuestLoyaltyRepository loyaltyRepository;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<GuestDTO> createGuest(@RequestBody GuestDTO guestDTO) {
        Guest guest = guestService.createGuest(guestDTO);
        GuestDTO response = GuestMapper.toDTO(guest);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GuestDTO> updateGuest(@PathVariable UUID id, @RequestBody GuestDTO guestDTO) {
        return ResponseEntity.ok(guestService.updateGuest(id, guestDTO));
    }

    @GetMapping("/{id}") public ResponseEntity<GuestDTO> getGuestById(@PathVariable UUID id) {
        return ResponseEntity.ok(guestService.getGuestById(id));
    }

    @GetMapping
    public ResponseEntity<PageResponse<GuestDTO>> getAllGuests(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        size = Math.min(size, 200);
        return ResponseEntity.ok(PageResponse.of(guestService.getAllGuests(
                PageRequest.of(page, size, Sort.by("lastName").ascending()))));
    }

    @DeleteMapping("/{id}") public ResponseEntity<Void> deleteGuest(@PathVariable UUID id) {
        guestService.deleteGuest(id); return ResponseEntity.noContent().build(); }

    /**
     * GDPR Data Export — returns a complete data package for a guest: profile,
     * booking history, and loyalty data. ADMIN/RECEPTION only.
     */
    @GetMapping("/{id}/data-export")
    public ResponseEntity<Map<String, Object>> gdprExport(@PathVariable UUID id) {
        GuestDTO guest = guestService.getGuestById(id);
        List<Booking> bookings = bookingRepository.findByGuestId(id); // targeted query, no full scan
        GuestLoyalty loyalty = loyaltyRepository.findByGuestId(id).orElse(null);

        List<Map<String, Object>> bookingData = bookings.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("checkIn", b.getCheckInDate());
            m.put("checkOut", b.getCheckOutDate());
            m.put("status", b.getBookingStatus());
            m.put("totalAmount", b.getTotalAmount());
            m.put("roomNumber", b.getRoomNumber());
            return m;
        }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("exportedAt", LocalDateTime.now().toString());
        result.put("guest", guest);
        result.put("bookings", bookingData);
        result.put("bookingCount", bookings.size());
        if (loyalty != null) {
            Map<String, Object> loyaltyData = new LinkedHashMap<>();
            loyaltyData.put("points", loyalty.getPoints());
            loyaltyData.put("tier", loyalty.getTier());
            loyaltyData.put("totalStays", loyalty.getTotalStays());
            loyaltyData.put("totalSpent", loyalty.getTotalSpent());
            result.put("loyalty", loyaltyData);
        }
        return ResponseEntity.ok(result);
    }
}
