package com.booksys.booking;
import com.booksys.room.RoomAvailabilityDTO;
import com.booksys.room.Room;
import com.booksys.room.RoomRepository;
import com.booksys.roomtype.RoomType;
import com.booksys.service.ServiceEntity;
import com.booksys.service.ServiceRepository;
import com.booksys.user.OwnershipService;
import lombok.RequiredArgsConstructor;
import com.booksys.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for booking management.
 *
 * <p>Base path: {@code /api/bookings}</p>
 *
 * <p>Exposes full CRUD operations plus booking lifecycle transitions
 * (check-in, check-out, cancel) and room-availability queries.
 * Price calculation is also available as a standalone endpoint so the
 * frontend can show a live total before the booking is committed.</p>
 */
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final RoomRepository roomRepository;
    private final ServiceRepository serviceRepository;
    private final OwnershipService ownershipService;

    /**
     * Creates a new booking.
     *
     * @param bookingDTO DTO with guest ID, room ID, date range, and optional service IDs
     * @return 200 OK with the persisted booking DTO
     */
    @PostMapping
    public ResponseEntity<BookingDTO> createBooking(@RequestBody BookingDTO bookingDTO){
        return ResponseEntity.ok(bookingService.createBooking(bookingDTO));
    }

    /**
     * Calculates the total price for a prospective booking without persisting it.
     * Useful for showing a live price preview in the UI before the user confirms.
     *
     * @param dto DTO with room ID, dates, and optional service IDs
     * @return 200 OK with the computed total as a {@link BigDecimal}
     */
    @PostMapping("/calculate")
    public ResponseEntity<BigDecimal> calculateTotal(@RequestBody BookingDTO dto) {
        // ---- Basic validations ----
        if (dto.getRoomId() == null) {
            throw new IllegalArgumentException("Room ID must not be null");
        }
        if (dto.getCheckInDate() == null || dto.getCheckOutDate() == null) {
            throw new IllegalArgumentException("Check-in and Check-out dates must not be null");
        }

        // ---- Fetch room & price ----
        Room room = roomRepository.findById(dto.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("Room not found: " + dto.getRoomId()));

        RoomType type = room.getRoomType();
        if (type == null) {
            throw new IllegalStateException("Room type is not assigned to the selected room.");
        }

        final int SCALE = 2;
        final RoundingMode RM = RoundingMode.HALF_UP;

        BigDecimal pricePerNight = type.getPricePerNight() == null
                ? BigDecimal.ZERO
                : type.getPricePerNight().setScale(SCALE, RM);
        // ---- Nights ----
        LocalDate in  = dto.getCheckInDate();
        LocalDate out = dto.getCheckOutDate();
        long nights = ChronoUnit.DAYS.between(in, out);
        if (nights <= 0) {
            throw new IllegalArgumentException("Invalid date range (at least 1 night required).");
        }
        // ---- Services total (optional) ----
        BigDecimal servicesTotal = BigDecimal.ZERO.setScale(SCALE, RM);
        if (dto.getServiceIds() != null && !dto.getServiceIds().isEmpty()) {
            List<ServiceEntity> services = serviceRepository.findAllById(dto.getServiceIds());
            servicesTotal = services.stream()
                    .map(s -> s.getPrice() == null ? BigDecimal.ZERO : s.getPrice())
                    .map(p -> p.setScale(SCALE, RM))
                    .reduce(BigDecimal.ZERO.setScale(SCALE, RM), BigDecimal::add);
        }
        // ---- Total = nights * pricePerNight + servicesTotal ----
        BigDecimal roomTotal = pricePerNight
                .multiply(BigDecimal.valueOf(nights))
                .setScale(SCALE, RM);

        BigDecimal total = roomTotal.add(servicesTotal).setScale(SCALE, RM);
        return ResponseEntity.ok(total);
    }

    /**
     * Updates an existing booking's dates, room, guest, and payment status.
     *
     * @param id         UUID of the booking to update
     * @param bookingDTO DTO with updated values
     * @return 200 OK with the updated booking DTO
     */
    @PutMapping("/{id}")
    public ResponseEntity<BookingDTO> updateBooking(@PathVariable UUID id, @RequestBody BookingDTO bookingDTO){
        return ResponseEntity.ok(bookingService.updateBooking(id, bookingDTO));
    }

    /**
     * Returns a single booking by its UUID.
     *
     * @param id UUID of the booking
     * @return 200 OK with the booking DTO
     */
    @GetMapping("/{id}")
    public ResponseEntity<BookingDTO> getBookingById(@PathVariable UUID id, Authentication auth) {
        ownershipService.requireBookingAccess(id, auth);
        return ResponseEntity.ok(bookingService.getBookingById(id));
    }

    /**
     * Returns a page of bookings sorted by check-in date descending.
     * Default: page 0, 50 items. Max size capped at 200 to prevent OOM.
     */
    @GetMapping
    public ResponseEntity<?> getAllBookings(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        size = Math.min(size, 5000);
        if (from != null && to != null) {
            return ResponseEntity.ok(bookingService.getBookingsInRange(from, to));
        }
        return ResponseEntity.ok(PageResponse.of(bookingService.getAllBookings(
                PageRequest.of(page, size, Sort.by("checkInDate").descending()))));
    }

    /** Returns all bookings for a specific guest (targeted DB query, not in-memory filter). */
    @GetMapping("/guest/{guestId}")
    public ResponseEntity<List<BookingDTO>> getByGuest(@PathVariable UUID guestId) {
        return ResponseEntity.ok(bookingService.getBookingsByGuest(guestId));
    }

    /**
     * Permanently deletes a booking.
     *
     * @param id UUID of the booking to delete
     * @return 204 No Content
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable UUID id) {
        bookingService.deleteBooking(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Transitions the booking to CHECKED_IN and marks the room OCCUPIED.
     *
     * @param id UUID of the booking
     * @return 200 OK with the updated booking DTO
     */
    @PutMapping("/{id}/checkin")
    public ResponseEntity<BookingDTO> checkIn(@PathVariable UUID id){
        return ResponseEntity.ok(bookingService.checkIn(id));
    }

    /**
     * Cancels the booking and frees the associated room.
     *
     * @param id UUID of the booking
     * @return 200 OK with the updated booking DTO
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<BookingDTO> cancelBooking(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.cancelBooking(id));
    }

    /**
     * Checks whether a room is available for the given date range without creating a booking.
     *
     * @param roomId       UUID of the room to check
     * @param checkInDate  requested check-in date
     * @param checkOutDate requested check-out date
     * @return 200 OK with {@code true} if available, {@code false} if already booked
     */
    @GetMapping("/check-availability")
    public ResponseEntity<Boolean> checkAvailability(
            @RequestParam UUID roomId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkInDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOutDate) {
        return ResponseEntity.ok(bookingService.isRoomAvailable(roomId, checkInDate, checkOutDate));
    }

    /**
     * Transitions the booking to CHECKED_OUT (or COMPLETED if already paid)
     * and frees the associated room.
     *
     * @param id UUID of the booking
     * @return 200 OK with the updated booking DTO
     */
    @PutMapping("/{id}/checkout")
    public ResponseEntity<BookingDTO> checkOut(@PathVariable UUID id) {
        return ResponseEntity.ok(bookingService.checkOut(id));
    }

    /**
     * Returns booked dates for all rooms with no date-range filter.
     * Included for backward compatibility; prefer {@code /availability} with query params.
     *
     * @return list of room availability DTOs
     */
    @GetMapping("/rooms/availability")
    public List<RoomAvailabilityDTO> getAllRoomAvailability() {
        return bookingService.getAllRoomsAvailability();
    }

    /**
     * Returns booked dates for all rooms within a date window.
     * Accepts both {@code from/to} and {@code checkIn/checkOut} parameter names
     * for compatibility with different frontend callers.
     *
     * @param from     start of window (inclusive); alias: {@code checkIn}
     * @param to       end of window (exclusive);   alias: {@code checkOut}
     * @param checkIn  alias for {@code from}
     * @param checkOut alias for {@code to}
     * @return 200 OK with list of room availability DTOs
     */
    @GetMapping("/availability")
    public ResponseEntity<List<RoomAvailabilityDTO>> getAllRoomsAvailability(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(name = "checkIn",  required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(name = "checkOut", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut
    ) {
        LocalDate start = (from != null) ? from : checkIn;
        LocalDate end   = (to   != null) ? to   : checkOut;
        return ResponseEntity.ok(bookingService.getAllRoomsAvailability(start, end));
    }
}
