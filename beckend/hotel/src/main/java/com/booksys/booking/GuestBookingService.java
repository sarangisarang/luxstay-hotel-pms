package com.booksys.booking;

import com.booksys.hotel.Hotel;
import com.booksys.room.Room;
import com.booksys.user.CurrentUser;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * What a guest may see and do with their own bookings — shared by the guest
 * account pages ({@code /api/user/bookings}) and the e-mailed manage-booking
 * link ({@code /api/public/bookings/manage}).
 *
 * <p>Ownership is always checked on the server. Before, bookings could be
 * listed and cancelled by anyone who knew (or guessed) the guest's e-mail.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GuestBookingService {

    /** Bookings a guest may still cancel themselves (not started, not finished). */
    private static final Set<BookingStatus> GUEST_CANCELLABLE = EnumSet.of(BookingStatus.PENDING, BookingStatus.CONFIRMED);

    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final CurrentUser currentUser;

    /** A booking as shown to the guest. No internal fields, no other guests' data. */
    public record GuestBookingView(
            UUID id,
            String reference,
            String hotel,
            Integer roomNumber,
            String roomType,
            LocalDate checkIn,
            LocalDate checkOut,
            long nights,
            String status,
            String paymentStatus,
            BigDecimal total,
            String currency,
            boolean canCancel,
            String cancellationPolicy
    ) {}

    /* ---------------------------------------------------------------- views */

    @Transactional(readOnly = true)
    public List<GuestBookingView> viewsOf(List<Booking> bookings) {
        LocalDate today = LocalDate.now();
        return bookings.stream().map(b -> view(b, today)).toList();
    }

    public GuestBookingView view(Booking b) {
        return view(b, LocalDate.now());
    }

    private GuestBookingView view(Booking b, LocalDate today) {
        Room room = b.getRoom();
        Hotel hotel = room != null ? room.getHotel() : null;
        long nights = b.getCheckInDate() != null && b.getCheckOutDate() != null
                ? b.getCheckOutDate().toEpochDay() - b.getCheckInDate().toEpochDay() : 0;
        String currency = hotel != null && hotel.getCurrency() != null && !hotel.getCurrency().isBlank()
                ? hotel.getCurrency().trim().toUpperCase(Locale.ROOT) : "EUR";
        return new GuestBookingView(
                b.getId(),
                b.getId().toString().substring(0, 8).toUpperCase(Locale.ROOT),
                hotel != null ? hotel.getName() : "",
                b.getRoomNumber() != null ? b.getRoomNumber() : room != null ? room.getRoomNumber() : null,
                room != null && room.getRoomType() != null ? room.getRoomType().getName() : null,
                b.getCheckInDate(),
                b.getCheckOutDate(),
                nights,
                b.getBookingStatus() != null ? b.getBookingStatus().name() : null,
                b.getPaymentStatus() != null ? b.getPaymentStatus().name() : null,
                b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO,
                currency,
                canCancel(b, today),
                hotel != null ? hotel.getCancellationPolicy() : null);
    }

    /* ------------------------------------------------------------ ownership */

    /** Bookings of the logged-in guest account (only its own guest profile). */
    @Transactional(readOnly = true)
    public List<GuestBookingView> myBookings() {
        UUID guestId = currentUser.requireGuest().getId();
        return viewsOf(bookingRepository.findByGuestIdOrderByCheckInDateDesc(guestId));
    }

    /**
     * Booking of the logged-in guest account.
     *
     * @throws EntityNotFoundException also for other guests' bookings, so IDs cannot be probed
     */
    public Booking requireMyBooking(UUID bookingId) {
        UUID guestId = currentUser.requireGuest().getId();
        return bookingRepository.findById(bookingId)
                .filter(b -> b.getGuest() != null && guestId.equals(b.getGuest().getId()))
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));
    }

    /**
     * Staff may access every booking; a guest account only bookings of its own
     * guest profile. Works with an explicit authentication (WebSocket frames).
     */
    @Transactional(readOnly = true)
    public boolean canAccess(Authentication auth, UUID bookingId) {
        if (auth == null || bookingId == null) return false;
        if (CurrentUser.isStaff(auth)) return true;
        return CurrentUser.hasRole(auth, "USER") && bookingRepository.isOwnedByAccount(bookingId, auth.getName());
    }

    /* --------------------------------------------------------- cancellation */

    /** A guest may cancel a pending/confirmed booking until the arrival day. */
    public static boolean canCancel(Booking b, LocalDate today) {
        return b.getBookingStatus() != null
                && GUEST_CANCELLABLE.contains(b.getBookingStatus())
                && b.getCheckInDate() != null
                && !b.getCheckInDate().isBefore(today);
    }

    /**
     * Cancels on behalf of the guest. Uses the same cancellation as the front
     * desk, so payments, invoices, e-mails and notifications stay consistent
     * (money already paid is flagged REFUND_REQUIRED for the hotel).
     */
    @Transactional
    public GuestBookingView cancelAsGuest(Booking booking) {
        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("This booking is already cancelled");
        }
        if (!canCancel(booking, LocalDate.now())) {
            throw new IllegalStateException(
                    "This booking can no longer be cancelled online. Please contact the hotel.");
        }
        bookingService.cancelBooking(booking.getId());
        log.info("Booking {} cancelled by the guest", booking.getId());
        Booking reloaded = bookingRepository.findById(booking.getId()).orElse(booking);
        return view(reloaded);
    }
}
