package com.booksys.guest;
import lombok.RequiredArgsConstructor;
import com.booksys.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;


//GuestController exposes REST API endpoints for guest CRUD operations,
//using DTOs for consistent, clean data structures with the frontend.
@RestController
@RequestMapping("/api/guests")
@RequiredArgsConstructor

public class GuestController {

 private final GuestService guestService;
 private final GuestDataExportService dataExportService;

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
     * DSGVO data export (Art. 15/20) of one guest: profile, stays, payments,
     * loyalty, preferences, online check-ins, reviews and communication.
     * Staff only; guests download their own data via /api/user/data-export.
     */
    @GetMapping("/{id}/data-export")
    public ResponseEntity<Map<String, Object>> gdprExport(@PathVariable UUID id) {
        return ResponseEntity.ok(dataExportService.export(id));
    }
}
