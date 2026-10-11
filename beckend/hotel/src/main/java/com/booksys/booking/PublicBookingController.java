package com.booksys.booking;

import com.booksys.hotel.Hotel;
import com.booksys.hotel.HotelRepository;
import com.booksys.room.Room;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import com.booksys.service.ServiceRepository;
import com.booksys.pricing.BookingQuote;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Public (no-auth) booking API used by the guest-facing booking pages.
 *
 * Flow:
 *   1. GET  /options              → which payment options are enabled
 *   2. POST /quote                → server-side price (dynamic pricing, services, voucher)
 *   3a. POST /pay-at-hotel        → confirmed booking, payment PENDING until paid at the hotel
 *   3b. POST /api/public/stripe/create-payment-intent → room held, Stripe PaymentIntent created
 *       → guest pays with the Stripe Payment Element (card data never reaches this server)
 *       → POST /confirm-payment (and the Stripe webhook) verify the payment and confirm the booking
 *   4. Viewing / cancelling later: {@link ManageBookingController} (signed link, no e-mail-only access)
 */
@Slf4j
@RestController
@RequestMapping("/api/public/bookings")
@RequiredArgsConstructor
public class PublicBookingController {

    private final BookingRepository    bookingRepository;
    private final RoomRepository       roomRepository;
    private final HotelRepository      hotelRepository;
    private final ServiceRepository    serviceRepository;
    private final OnlineBookingService onlineBookingService;

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

    // ── Online booking: options, quote, pay at hotel, confirm online payment ──

    /** Which payment options the website should offer (pay at hotel / online). */
    @GetMapping("/options")
    public ResponseEntity<OnlineBookingDtos.BookingOptions> options() {
        return ResponseEntity.ok(onlineBookingService.options());
    }

    /**
     * Server-side price of a stay including dynamic pricing, services and voucher.
     * The checkout page shows this; the booking is created from the same calculation.
     */
    @PostMapping("/quote")
    public ResponseEntity<BookingQuote> quote(@RequestBody OnlineBookingDtos.QuoteRequest req) {
        return ResponseEntity.ok(onlineBookingService.quote(req));
    }

    /**
     * Book now, pay at the hotel. The booking is confirmed; its payment stays
     * PENDING until reception records the money. Nothing is marked as paid here.
     */
    @PostMapping("/pay-at-hotel")
    public ResponseEntity<OnlineBookingDtos.BookingConfirmation> payAtHotel(
            @RequestBody OnlineBookingDtos.BookingRequest req) {
        return ResponseEntity.ok(onlineBookingService.bookPayAtHotel(req));
    }

    /**
     * Called by the browser after Stripe reported a successful payment. The
     * server verifies the PaymentIntent with Stripe (status, amount, currency,
     * booking reference) before confirming; the webhook does the same, so a
     * closed browser tab cannot lose a paid booking.
     */
    @PostMapping("/confirm-payment")
    public ResponseEntity<OnlineBookingDtos.BookingConfirmation> confirmPayment(
            @RequestBody OnlineBookingDtos.ConfirmPaymentRequest req) {
        return ResponseEntity.ok(onlineBookingService.confirmStripePayment(req.paymentIntentId()));
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
