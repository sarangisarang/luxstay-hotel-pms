package com.booksys.booking;

import com.booksys.email.BookingEmailData;
import com.booksys.email.EmailService;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import com.booksys.hotel.Hotel;
import com.booksys.hotel.HotelRepository;
import com.booksys.payment.Payment;
import com.booksys.payment.PaymentRepository;
import com.booksys.payment.PaymentStatus;
import com.booksys.room.Room;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import com.booksys.service.ServiceRepository;
import com.booksys.stripe.StripeService;
import com.stripe.model.PaymentIntent;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Public (no-auth) booking endpoint used by the guest-facing online booking page.
 *
 * Flow:
 *   1. Frontend creates a PaymentIntent via /api/public/stripe/create-payment-intent
 *   2. Guest pays with Stripe Elements (card collected on frontend)
 *   3. On Stripe success, frontend calls POST /api/public/bookings with the paymentIntentId
 *   4. This controller verifies the PaymentIntent is "succeeded", creates the booking,
 *      and sends a confirmation email.
 */
@Slf4j
@RestController
@RequestMapping("/api/public/bookings")
@RequiredArgsConstructor
public class PublicBookingController {

    private final BookingRepository    bookingRepository;
    private final RoomRepository       roomRepository;
    private final GuestRepository      guestRepository;
    private final PaymentRepository    paymentRepository;
    private final HotelRepository      hotelRepository;
    private final ServiceRepository    serviceRepository;
    private final StripeService        stripeService;
    private final EmailService         emailService;

    /**
     * Returns distinct countries and cities for the booking page location dropdowns.
     * No authentication required.
     */
    @GetMapping("/locations")
    public ResponseEntity<?> locations() {
        var hotels = hotelRepository.findAll();
        // Build: { countries: ["Georgia",...], cities: { "Georgia": ["Tbilisi","Batumi"] } }
        var countries = hotels.stream()
                .map(Hotel::getCountry)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted()
                .toList();
        var citiesByCountry = new java.util.LinkedHashMap<String, java.util.List<String>>();
        hotels.stream()
                .filter(h -> h.getCountry() != null && !h.getCountry().isBlank()
                          && h.getCity()    != null && !h.getCity().isBlank())
                .forEach(h -> citiesByCountry
                        .computeIfAbsent(h.getCountry(), k -> new java.util.ArrayList<>())
                        .add(h.getCity()));
        citiesByCountry.values().forEach(list -> {
            java.util.Collections.sort(list);
            // deduplicate
            var seen = new java.util.LinkedHashSet<>(list);
            list.clear();
            list.addAll(seen);
        });
        return ResponseEntity.ok(Map.of("countries", countries, "cities", citiesByCountry));
    }

    /** Returns all services for the public checkout page (no auth required). */
    @GetMapping("/services")
    public ResponseEntity<?> publicServices() {
        var services = serviceRepository.findAll();
        List<Map<String, Object>> result = services.stream()
                .map(s -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id",          s.getId());
                    m.put("name",        s.getName());
                    m.put("description", s.getDescription() != null ? s.getDescription() : "");
                    m.put("price",       s.getPrice() != null ? s.getPrice() : BigDecimal.ZERO);
                    return m;
                })
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Returns publicly accessible room info for the booking page.
     * No authentication required.
     */
    @GetMapping("/available-rooms")
    public ResponseEntity<?> availableRooms(
            @RequestParam LocalDate checkIn,
            @RequestParam LocalDate checkOut) {

        if (checkOut.isBefore(checkIn) || checkOut.isEqual(checkIn)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Check-out must be after check-in"));
        }

        // Return all rooms that have no conflicting active booking
        var allRooms = roomRepository.findAll();
        var free = allRooms.stream()
                .filter(r -> r.getRoomStatus() != RoomStatus.MAINTENANCE)
                .filter(r -> bookingRepository
                        .findOverlapping(r.getId(), checkIn, checkOut, BookingStatus.CANCELLED)
                        .isEmpty())
                .map(this::toPublicRoomView)
                .toList();

        return ResponseEntity.ok(free);
    }

    /**
     * Confirms a booking after successful Stripe payment.
     * Verifies the PaymentIntent status with Stripe before persisting.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<?> confirmBooking(@RequestBody PublicBookingRequest req) {

        // 1. Validate dates
        if (req.checkIn() == null || req.checkOut() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Check-in and check-out are required"));
        }
        if (!req.checkOut().isAfter(req.checkIn())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Check-out must be after check-in"));
        }

        // 2. Verify Stripe payment succeeded
        try {
            PaymentIntent intent = stripeService.retrieve(req.paymentIntentId());
            if (!"succeeded".equals(intent.getStatus())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Payment not completed. Status: " + intent.getStatus()));
            }
        } catch (Exception e) {
            log.error("Stripe verification failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", "Payment verification failed"));
        }

        // 3. Load room
        Room room = roomRepository.findById(req.roomId())
                .orElseThrow(() -> new EntityNotFoundException("Room not found: " + req.roomId()));

        // 4. Double-check availability (race condition guard)
        boolean conflict = !bookingRepository
                .findOverlapping(room.getId(), req.checkIn(), req.checkOut(), BookingStatus.CANCELLED)
                .isEmpty();
        if (conflict) {
            return ResponseEntity.status(409)
                    .body(Map.of("error", "Room is no longer available for the selected dates"));
        }

        // 5. Find or create guest
        Guest guest = guestRepository.findByEmail(req.email())
                .orElseGet(() -> {
                    Guest g = new Guest();
                    g.setFirstName(req.firstName());
                    g.setLastName(req.lastName());
                    g.setEmail(req.email());
                    g.setPhone(req.phone());
                    return guestRepository.save(g);
                });

        // 6. Calculate total
        long nights = ChronoUnit.DAYS.between(req.checkIn(), req.checkOut());
        BigDecimal pricePerNight = room.getRoomType() != null && room.getRoomType().getPricePerNight() != null
                ? room.getRoomType().getPricePerNight()
                : BigDecimal.ZERO;
        BigDecimal total = pricePerNight.multiply(BigDecimal.valueOf(nights))
                .setScale(2, RoundingMode.HALF_UP);

        // 7. Create booking
        Booking booking = new Booking();
        booking.setGuest(guest);
        booking.setRoom(room);
        booking.setCheckInDate(req.checkIn());
        booking.setCheckOutDate(req.checkOut());
        booking.setBookingStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setTotalAmount(total);
        booking.setStripePaymentIntentId(req.paymentIntentId());
        booking.setServices(new ArrayList<>());
        bookingRepository.save(booking);

        // 8. Mark room as reserved
        room.setRoomStatus(RoomStatus.RESERVED);
        roomRepository.save(room);

        // 9. Record payment
        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setAmount(total);
        payment.setPaymentMethod("STRIPE");
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(LocalDateTime.now());
        paymentRepository.save(payment);

        // 10. Send confirmation email (async, non-blocking)
        try {
            long emailNights = req.checkOut().toEpochDay() - req.checkIn().toEpochDay();
            String hotelName = room.getHotel() != null ? room.getHotel().getName() : "LuxStay";
            emailService.sendBookingConfirmation(new BookingEmailData(
                    booking.getId().toString().substring(0, 8).toUpperCase(),
                    guest.getEmail(),
                    guest.getFirstName() + " " + guest.getLastName(),
                    hotelName,
                    String.valueOf(room.getRoomNumber()),
                    req.checkIn(),
                    req.checkOut(),
                    emailNights,
                    total
            ));
        } catch (Exception ignored) {}

        log.info("Public booking {} created for guest {} room {}",
                booking.getId(), guest.getEmail(), room.getRoomNumber());

        return ResponseEntity.ok(Map.of(
                "bookingId",   booking.getId(),
                "guestName",   guest.getFirstName() + " " + guest.getLastName(),
                "hotel",       room.getHotel() != null ? room.getHotel().getName() : "",
                "room",        room.getRoomNumber(),
                "checkIn",     req.checkIn().toString(),
                "checkOut",    req.checkOut().toString(),
                "total",       total,
                "status",      "CONFIRMED"
        ));
    }

    /**
     * Guest self-service: look up all bookings for an email address.
     * No authentication required — email is the only identifier for public guests.
     */
    @GetMapping("/my-bookings")
    public ResponseEntity<?> myBookings(@RequestParam String email) {
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "email is required"));
        }
        var bookings = bookingRepository.findByGuestEmail(email.trim().toLowerCase());
        var result = bookings.stream().map(b -> {
            var room  = b.getRoom();
            var hotel = room != null && room.getHotel() != null ? room.getHotel().getName() : "";
            return Map.<String, Object>of(
                    "id",            b.getId(),
                    "hotel",         hotel,
                    "roomNumber",    room != null && room.getRoomNumber() != null ? room.getRoomNumber() : 0,
                    "checkIn",       b.getCheckInDate() != null  ? b.getCheckInDate().toString()  : "",
                    "checkOut",      b.getCheckOutDate() != null ? b.getCheckOutDate().toString() : "",
                    "status",        b.getBookingStatus() != null ? b.getBookingStatus().name() : "",
                    "paymentStatus", b.getPaymentStatus() != null ? b.getPaymentStatus().name() : "",
                    "total",         b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO
            );
        }).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Direct booking without Stripe (used in dev/demo mode with dummy Stripe keys).
     * Accepts card details for display only — no real charge is made.
     */
    @PostMapping("/direct")
    @Transactional
    public ResponseEntity<?> confirmBookingDirect(@RequestBody DirectBookingRequest req) {
        if (req.checkIn() == null || req.checkOut() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Check-in and check-out are required"));
        }
        if (!req.checkOut().isAfter(req.checkIn())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Check-out must be after check-in"));
        }

        Room room = roomRepository.findById(req.roomId())
                .orElseThrow(() -> new EntityNotFoundException("Room not found: " + req.roomId()));

        boolean conflict = !bookingRepository
                .findOverlapping(room.getId(), req.checkIn(), req.checkOut(), BookingStatus.CANCELLED)
                .isEmpty();
        if (conflict) {
            return ResponseEntity.status(409)
                    .body(Map.of("error", "Room is no longer available for the selected dates"));
        }

        Guest guest = guestRepository.findByEmail(req.email())
                .orElseGet(() -> {
                    Guest g = new Guest();
                    g.setFirstName(req.firstName());
                    g.setLastName(req.lastName());
                    g.setEmail(req.email());
                    g.setPhone(req.phone() != null ? req.phone() : "");
                    return guestRepository.save(g);
                });

        long nights = ChronoUnit.DAYS.between(req.checkIn(), req.checkOut());
        BigDecimal pricePerNight = room.getRoomType() != null && room.getRoomType().getPricePerNight() != null
                ? room.getRoomType().getPricePerNight()
                : BigDecimal.ZERO;
        BigDecimal total = pricePerNight.multiply(BigDecimal.valueOf(nights))
                .setScale(2, RoundingMode.HALF_UP);

        Booking booking = new Booking();
        booking.setGuest(guest);
        booking.setRoom(room);
        booking.setCheckInDate(req.checkIn());
        booking.setCheckOutDate(req.checkOut());
        booking.setBookingStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setTotalAmount(total);
        booking.setServices(new ArrayList<>());
        bookingRepository.save(booking);

        room.setRoomStatus(RoomStatus.RESERVED);
        roomRepository.save(room);

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setAmount(total);
        payment.setPaymentMethod("CARD");
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(LocalDateTime.now());
        paymentRepository.save(payment);

        try {
            String hotelName = room.getHotel() != null ? room.getHotel().getName() : "LuxStay";
            emailService.sendBookingConfirmation(new BookingEmailData(
                    booking.getId().toString().substring(0, 8).toUpperCase(),
                    guest.getEmail(),
                    guest.getFirstName() + " " + guest.getLastName(),
                    hotelName, String.valueOf(room.getRoomNumber()),
                    req.checkIn(), req.checkOut(), nights, total
            ));
        } catch (Exception ignored) {}

        log.info("Direct booking {} created for guest {} room {}", booking.getId(), guest.getEmail(), room.getRoomNumber());

        return ResponseEntity.ok(Map.of(
                "bookingId",   booking.getId(),
                "guestName",   guest.getFirstName() + " " + guest.getLastName(),
                "hotel",       room.getHotel() != null ? room.getHotel().getName() : "",
                "room",        room.getRoomNumber(),
                "checkIn",     req.checkIn().toString(),
                "checkOut",    req.checkOut().toString(),
                "total",       total,
                "status",      "CONFIRMED"
        ));
    }

    /**
     * Guest self-service: cancel a booking by ID, verified against guest email.
     */
    @PostMapping("/{id}/cancel")
    @Transactional
    public ResponseEntity<?> cancelBooking(@PathVariable UUID id, @RequestParam String email) {
        var booking = bookingRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));
        if (booking.getGuest() == null
                || !booking.getGuest().getEmail().equalsIgnoreCase(email.trim())) {
            return ResponseEntity.status(403).body(Map.of("error", "Email does not match booking"));
        }
        if (booking.getBookingStatus() == BookingStatus.CHECKED_IN
                || booking.getBookingStatus() == BookingStatus.COMPLETED
                || booking.getBookingStatus() == BookingStatus.CHECKED_OUT) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Cannot cancel a booking that has already started"));
        }
        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            return ResponseEntity.badRequest().body(Map.of("error", "Booking is already cancelled"));
        }
        booking.setBookingStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        // Free the room if it was reserved for this booking
        if (booking.getRoom() != null) {
            booking.getRoom().setRoomStatus(RoomStatus.FREE);
            roomRepository.save(booking.getRoom());
        }
        log.info("Public cancel: booking {} cancelled by guest {}", id, email);
        return ResponseEntity.ok(Map.of("message", "Booking cancelled successfully"));
    }

    private Map<String, Object> toPublicRoomView(Room r) {
        var rt = r.getRoomType();
        var hotelName = r.getHotel() != null ? r.getHotel().getName() : "";
        var hotelId   = r.getHotel() != null ? r.getHotel().getId()   : UUID.randomUUID();
        String roomImage = (r.getImageUrl() != null && !r.getImageUrl().isBlank())
                ? r.getImageUrl()
                : (rt != null && rt.getImageUrl() != null && !rt.getImageUrl().isBlank()
                   ? rt.getImageUrl()
                   : "");
        Map<String, Object> view = new java.util.HashMap<>();
        view.put("id",             r.getId());
        view.put("roomNumber",     r.getRoomNumber() != null ? r.getRoomNumber() : 0);
        view.put("floor",          r.getFloor() != null ? r.getFloor() : "");
        view.put("description",    r.getDescription() != null ? r.getDescription() : "");
        view.put("imageUrl",       roomImage);
        view.put("hotel",          hotelName);
        view.put("hotelId",        hotelId);
        view.put("typeName",       rt != null && rt.getName() != null ? rt.getName() : "");
        view.put("pricePerNight",  rt != null && rt.getPricePerNight() != null ? rt.getPricePerNight() : BigDecimal.ZERO);
        view.put("capacity",       rt != null ? rt.getCapacity() : 1);
        view.put("hotelAddress",   r.getHotel() != null && r.getHotel().getAddress() != null ? r.getHotel().getAddress() : "");
        view.put("hotelLatitude",  r.getHotel() != null ? r.getHotel().getLatitude() : null);
        view.put("hotelLongitude", r.getHotel() != null ? r.getHotel().getLongitude() : null);
        view.put("hotelCity",      r.getHotel() != null && r.getHotel().getCity() != null ? r.getHotel().getCity() : "");
        view.put("hotelCountry",   r.getHotel() != null && r.getHotel().getCountry() != null ? r.getHotel().getCountry() : "");
        return view;
    }
}
