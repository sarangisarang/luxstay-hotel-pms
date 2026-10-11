package com.booksys.booking;

import com.booksys.booking.OnlineBookingDtos.BookingConfirmation;
import com.booksys.booking.OnlineBookingDtos.BookingOptions;
import com.booksys.booking.OnlineBookingDtos.BookingRequest;
import com.booksys.booking.OnlineBookingDtos.QuoteRequest;
import com.booksys.booking.OnlineBookingDtos.StripeCheckout;
import com.booksys.email.BookingEmailData;
import com.booksys.email.EmailService;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import com.booksys.notification.NotificationService;
import com.booksys.payment.BookingPaymentSync;
import com.booksys.payment.Payment;
import com.booksys.payment.PaymentRepository;
import com.booksys.payment.PaymentStatus;
import com.booksys.pricing.BookingQuote;
import com.booksys.pricing.BookingQuoteService;
import com.booksys.room.Room;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import com.booksys.service.ServiceEntity;
import com.booksys.stripe.StripeService;
import com.booksys.voucher.VoucherRepository;
import com.booksys.voucher.VoucherService;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Bookings made by guests on the public website.
 *
 * <p>Two ways to book, both priced by {@link BookingQuoteService} on the server:</p>
 * <ul>
 *   <li><b>Pay at the hotel</b> — the booking is confirmed, its payment stays
 *       PENDING until reception records the money. Nothing is marked as paid
 *       that was not paid (the old "direct" endpoint marked such bookings PAID).</li>
 *   <li><b>Pay online (Stripe)</b> — the room is held as a PENDING booking, a
 *       PaymentIntent is created for the server-side total, and the booking is
 *       confirmed only after Stripe reports the full amount as received. Unpaid
 *       holds expire after {@link OnlineBookingSettings#stripeHoldMinutes()}.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OnlineBookingService {

    /** Pragmatic email check: something@domain.tld, no spaces. */
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    static final String OPTION_PAY_AT_HOTEL = "PAY_AT_HOTEL";
    static final String OPTION_STRIPE = "STRIPE";

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final GuestRepository guestRepository;
    private final PaymentRepository paymentRepository;
    private final VoucherRepository voucherRepository;
    private final BookingQuoteService quoteService;
    private final VoucherService voucherService;
    private final BookingPaymentSync paymentSync;
    private final StripeService stripeService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final OnlineBookingSettings settings;
    private final BookingManageTokens manageTokens;
    private final com.booksys.user.CurrentUser currentUser;

    @org.springframework.beans.factory.annotation.Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl = "http://localhost:3000";

    // ── Read-only ─────────────────────────────────────────────────────────────

    /** Payment options the website should offer. */
    public BookingOptions options() {
        return new BookingOptions(
                settings.payAtHotelEnabled(),
                settings.stripeEnabled(),
                settings.stripeEnabled() ? settings.stripePublishableKey() : null,
                settings.maxNights(),
                settings.maxAdvanceDays());
    }

    /** Server-side price for a stay, with the same limits as a real booking. */
    public BookingQuote quote(QuoteRequest req) {
        validateStay(req.checkIn(), req.checkOut());
        return quoteService.quote(req.roomId(), req.checkIn(), req.checkOut(), req.serviceIds(), req.voucherCode());
    }

    // ── Pay at the hotel ─────────────────────────────────────────────────────

    /**
     * Books a room to be paid at the hotel. The booking is CONFIRMED and its
     * payment is PENDING; it is never marked as paid here.
     */
    @Transactional
    public BookingConfirmation bookPayAtHotel(BookingRequest req) {
        if (!settings.payAtHotelEnabled()) {
            throw new IllegalStateException("Paying at the hotel is not available. Please pay online.");
        }
        Booking booking = createBooking(req, BookingStatus.CONFIRMED, OPTION_PAY_AT_HOTEL);
        sendConfirmation(booking);
        notifyReception(booking, "New website booking (pay at hotel)");
        return confirmationOf(booking, OPTION_PAY_AT_HOTEL);
    }

    // ── Pay online with Stripe ───────────────────────────────────────────────

    /**
     * Holds the room as a PENDING booking and creates a Stripe PaymentIntent for
     * the server-calculated total. The browser then collects the card with the
     * Stripe Payment Element; card data never reaches this server.
     */
    @Transactional
    public StripeCheckout startStripeCheckout(BookingRequest req) {
        requireStripe();
        Booking booking = createBooking(req, BookingStatus.PENDING, OPTION_STRIPE);
        if (booking.getTotalAmount() == null || booking.getTotalAmount().signum() <= 0) {
            throw new IllegalArgumentException("Nothing to pay online for this booking");
        }
        String currency = currencyOf(booking);
        PaymentIntent intent;
        try {
            intent = stripeService.createPaymentIntent(
                    booking.getTotalAmount().movePointRight(2).longValueExact(),
                    currency,
                    "Booking " + referenceOf(booking) + " — room " + booking.getRoomNumber()
                            + ", " + booking.getCheckInDate() + " → " + booking.getCheckOutDate(),
                    Map.of("bookingId", booking.getId().toString(),
                           "reference", referenceOf(booking)),
                    "booking-" + booking.getId());
        } catch (StripeException e) {
            log.error("Stripe PaymentIntent creation failed for booking {}: {}", booking.getId(), e.getMessage());
            // Rolls back the hold: no booking without a way to pay for it
            throw new IllegalStateException("Online payment is temporarily unavailable. Please try again later.");
        }

        booking.setStripePaymentIntentId(intent.getId());
        bookingRepository.save(booking);
        paymentSync.pendingPlaceholder(booking).ifPresent(p -> {
            p.setExternalReference(intent.getId());
            paymentRepository.save(p);
        });

        return new StripeCheckout(
                booking.getId(), referenceOf(booking), intent.getClientSecret(), intent.getId(),
                booking.getTotalAmount(), currency, settings.stripePublishableKey(),
                booking.getCreatedAt().plusMinutes(settings.stripeHoldMinutes()));
    }

    /**
     * Confirms the booking of a PaymentIntent once Stripe has received the full
     * amount. Called by the browser after payment and by the webhook; whichever
     * comes second finds the booking already paid and returns it unchanged.
     *
     * @throws EntityNotFoundException  unknown PaymentIntent
     * @throws IllegalStateException    payment not (yet) complete, or the hold already expired
     * @throws IllegalArgumentException amount, currency or booking reference do not match
     */
    @Transactional
    public BookingConfirmation confirmStripePayment(String paymentIntentId) {
        requireStripe();
        if (paymentIntentId == null || paymentIntentId.isBlank()) {
            throw new IllegalArgumentException("Payment reference is missing");
        }
        Booking booking = bookingRepository.findByStripePaymentIntentIdForUpdate(paymentIntentId)
                .orElseThrow(() -> new EntityNotFoundException("Unknown payment"));
        if (booking.getPaymentStatus() == PaymentStatus.PAID) {
            return confirmationOf(booking, OPTION_STRIPE);   // already confirmed: idempotent
        }

        PaymentIntent intent;
        try {
            intent = stripeService.retrieve(paymentIntentId);
        } catch (StripeException e) {
            log.error("Stripe lookup failed for {}: {}", paymentIntentId, e.getMessage());
            throw new IllegalStateException("Could not verify the payment right now. Please try again shortly.");
        }
        verifyIntentMatchesBooking(intent, booking);

        Payment payment = paymentSync.pendingPlaceholder(booking)
                .orElseGet(() -> BookingPaymentSync.newPaymentFor(booking));
        payment.setAmount(booking.getTotalAmount());
        payment.setPaymentMethod(OPTION_STRIPE);
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaymentDate(LocalDateTime.now());
        payment.setExternalReference(paymentIntentId);
        paymentRepository.save(payment);

        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            // The hold expired before the money arrived. Keep the money visible
            // and flag it for a refund instead of silently confirming. Returned
            // normally (not thrown) so the transaction keeps this record.
            booking.setPaymentStatus(PaymentStatus.REFUND_REQUIRED);
            bookingRepository.save(booking);
            notificationService.create("PAYMENT_AFTER_EXPIRY", "Refund needed",
                    "Online payment " + paymentIntentId + " arrived after booking "
                            + referenceOf(booking) + " had expired. Refund it in Stripe.", "ADMIN");
            return confirmationOf(booking, OPTION_STRIPE);
        }

        booking.setBookingStatus(BookingStatus.CONFIRMED);
        paymentSync.recalculate(booking);
        sendConfirmation(booking);
        notifyReception(booking, "New website booking (paid online)");
        return confirmationOf(booking, OPTION_STRIPE);
    }

    /** Stripe reported a failed attempt; the guest may retry until the hold expires. */
    @Transactional
    public void markStripePaymentFailed(String paymentIntentId) {
        bookingRepository.findByStripePaymentIntentIdForUpdate(paymentIntentId).ifPresent(booking -> {
            if (booking.getBookingStatus() == BookingStatus.PENDING
                    && booking.getPaymentStatus() != PaymentStatus.PAID) {
                booking.setPaymentStatus(PaymentStatus.FAILED);
                bookingRepository.save(booking);
            }
        });
    }

    /**
     * Releases rooms held for online payments that never completed. Before a
     * hold is released, Stripe is asked for the real state: a payment that did
     * succeed is confirmed instead, one still processing is left alone, and
     * nothing is cancelled while Stripe cannot be reached.
     *
     * @return number of holds released
     */
    @Transactional
    public int expireStaleStripeHolds() {
        if (!settings.stripeEnabled()) return 0;
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(settings.stripeHoldMinutes());
        int released = 0;
        for (Booking hold : bookingRepository.findStaleOnlineHolds(cutoff)) {
            String piId = hold.getStripePaymentIntentId();
            try {
                PaymentIntent intent = stripeService.retrieve(piId);
                if ("succeeded".equals(intent.getStatus())) {
                    confirmStripePayment(piId);
                    continue;
                }
                if ("processing".equals(intent.getStatus())) {
                    continue;   // bank transfer / SEPA still in flight
                }
                stripeService.cancelIfPossible(intent);
            } catch (StripeException e) {
                log.warn("Skipping hold {}: Stripe not reachable ({})", hold.getId(), e.getMessage());
                continue;
            } catch (RuntimeException e) {
                log.warn("Skipping hold {}: {}", hold.getId(), e.getMessage());
                continue;
            }
            hold.setBookingStatus(BookingStatus.CANCELLED);
            hold.setPaymentStatus(PaymentStatus.CANCELLED);
            for (Payment p : paymentRepository.findByBookingId(hold.getId())) {
                if (p.getStatus() == PaymentStatus.PENDING) {
                    p.setStatus(PaymentStatus.CANCELLED);
                    paymentRepository.save(p);
                }
            }
            bookingRepository.save(hold);
            released++;
            log.info("Released unpaid online hold {} (PaymentIntent {})", hold.getId(), piId);
        }
        return released;
    }

    // ── Internals ────────────────────────────────────────────────────────────

    /**
     * Validates the request, locks the room, re-checks availability under the
     * lock, and persists the booking with a PENDING placeholder payment.
     */
    private Booking createBooking(BookingRequest req, BookingStatus status, String option) {
        validateGuest(req);
        validateStay(req.checkIn(), req.checkOut());
        if (req.roomId() == null) throw new IllegalArgumentException("Room is required");

        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (bookingRepository.countOpenBookingsForEmail(email, LocalDate.now())
                >= settings.maxOpenBookingsPerEmail()) {
            throw new IllegalStateException(
                    "This email address already has the maximum number of open online bookings. "
                    + "Please contact the hotel.");
        }

        // Pessimistic lock serialises concurrent attempts for the same room
        Room room = roomRepository.findByIdForUpdate(req.roomId())
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));
        if (room.getRoomStatus() == RoomStatus.MAINTENANCE) {
            throw new IllegalStateException("This room cannot be booked at the moment");
        }
        if (bookingRepository.existsOverlappingBooking(room.getId(), req.checkIn(), req.checkOut())) {
            throw new IllegalStateException("Room is no longer available for the selected dates");
        }

        List<ServiceEntity> services = quoteService.loadServices(req.serviceIds());
        BookingQuote quote = quoteService.quote(room, req.checkIn(), req.checkOut(), services, req.voucherCode());
        if (quote.voucherCode() != null) {
            voucherRepository.findByCodeIgnoreCase(quote.voucherCode()).ifPresent(voucherService::redeem);
        }

        Guest guest = findOrCreateGuest(req, email);

        Booking booking = new Booking();
        booking.setGuest(guest);
        booking.setGuestName((guest.getFirstName() + " " + guest.getLastName()).trim());
        booking.setRoom(room);
        booking.setRoomNumber(room.getRoomNumber());
        booking.setCheckInDate(req.checkIn());
        booking.setCheckOutDate(req.checkOut());
        booking.setServices(new ArrayList<>(services));
        booking.setTotalServiceAmount(quote.servicesTotal());
        booking.setDiscountAmount(quote.discount());
        booking.setVoucherCode(quote.voucherCode());
        booking.setTotalAmount(quote.total());
        booking.setBookingStatus(status);
        booking.setPaymentStatus(PaymentStatus.PENDING);
        booking.setBookingSource(BookingSource.DIRECT_WEBSITE);
        booking.setSpecialRequests(trimToNull(req.specialRequests(), 1000));
        bookingRepository.save(booking);

        Payment placeholder = BookingPaymentSync.newPaymentFor(booking);
        placeholder.setAmount(quote.total());
        placeholder.setPaymentMethod(option);
        placeholder.setStatus(PaymentStatus.PENDING);
        placeholder.setPaymentDate(LocalDateTime.now());
        paymentRepository.save(placeholder);
        return booking;
    }

    /**
     * Guest record for the booking. A logged-in guest account books as itself.
     * Otherwise a returning guest's record (matched by e-mail) is reused only if
     * it is not linked to a registered account: registration does not verify
     * e-mail ownership, so linking by e-mail alone would show this booking to
     * whoever registered the address.
     */
    private Guest findOrCreateGuest(BookingRequest req, String email) {
        java.util.Optional<Guest> accountGuest = com.booksys.user.CurrentUser.authentication()
                .filter(a -> com.booksys.user.CurrentUser.hasRole(a, "USER"))
                .flatMap(a -> currentUser.guestOf(a.getName()));
        if (accountGuest.isPresent()) {
            return accountGuest.get();
        }
        return guestRepository.findFirstByEmailIgnoreCaseAndAppUserIsNull(email).orElseGet(() -> {
            Guest g = new Guest();
            g.setFirstName(req.firstName().trim());
            g.setLastName(req.lastName().trim());
            g.setEmail(email);
            g.setPhone(trimToNull(req.phone(), 40));
            return guestRepository.save(g);
        });
    }

    private void validateGuest(BookingRequest req) {
        if (isBlank(req.firstName()) || isBlank(req.lastName())) {
            throw new IllegalArgumentException("First and last name are required");
        }
        if (req.firstName().length() > 100 || req.lastName().length() > 100) {
            throw new IllegalArgumentException("Name is too long");
        }
        if (isBlank(req.email()) || req.email().length() > 254 || !EMAIL.matcher(req.email().trim()).matches()) {
            throw new IllegalArgumentException("A valid email address is required");
        }
    }

    /** Date rules shared by the quote and the booking. */
    private void validateStay(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null) {
            throw new IllegalArgumentException("Check-in and check-out are required");
        }
        LocalDate today = LocalDate.now();
        if (checkIn.isBefore(today)) {
            throw new IllegalArgumentException("Check-in cannot be in the past");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new IllegalArgumentException("Check-out must be after check-in");
        }
        long nights = java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights > settings.maxNights()) {
            throw new IllegalArgumentException(
                    "Online bookings are limited to " + settings.maxNights() + " nights. Please contact the hotel.");
        }
        if (checkIn.isAfter(today.plusDays(settings.maxAdvanceDays()))) {
            throw new IllegalArgumentException("This date is too far in the future to book online");
        }
    }

    /** Checks that Stripe received exactly what this booking costs. */
    private void verifyIntentMatchesBooking(PaymentIntent intent, Booking booking) {
        String status = intent.getStatus();
        if ("processing".equals(status)) {
            throw new IllegalStateException("The payment is still being processed. You will receive an email once it completes.");
        }
        if (!"succeeded".equals(status)) {
            throw new IllegalStateException("The payment has not been completed");
        }
        String metaBooking = intent.getMetadata() == null ? null : intent.getMetadata().get("bookingId");
        if (metaBooking == null || !metaBooking.equals(booking.getId().toString())) {
            throw new IllegalArgumentException("Payment does not belong to this booking");
        }
        long expected = booking.getTotalAmount().movePointRight(2).longValueExact();
        Long received = intent.getAmountReceived() != null ? intent.getAmountReceived() : intent.getAmount();
        if (received == null || received != expected) {
            log.error("Amount mismatch for booking {}: expected {} got {}", booking.getId(), expected, received);
            throw new IllegalArgumentException("Paid amount does not match the booking total");
        }
        if (intent.getCurrency() == null || !intent.getCurrency().equalsIgnoreCase(currencyOf(booking))) {
            throw new IllegalArgumentException("Payment currency does not match the booking");
        }
    }

    private void requireStripe() {
        if (!settings.stripeEnabled()) {
            throw new IllegalStateException("Online payment is not available. Please choose to pay at the hotel.");
        }
    }

    private void sendConfirmation(Booking booking) {
        try {
            Guest guest = booking.getGuest();
            Room room = booking.getRoom();
            com.booksys.hotel.Hotel hotel = room != null ? room.getHotel() : null;
            boolean paid = booking.getPaymentStatus() == PaymentStatus.PAID;
            String total = formatMoney(booking.getTotalAmount(), currencyOf(booking));
            String manageLink = frontendBaseUrl.replaceAll("/+$", "") + "/book/manage?token=" + manageTokenFor(booking);
            emailService.sendBookingConfirmation(new BookingEmailData(
                    referenceOf(booking),
                    guest.getEmail(),
                    booking.getGuestName(),
                    hotel != null ? hotel.getName() : "",
                    String.valueOf(booking.getRoomNumber()),
                    booking.getCheckInDate(),
                    booking.getCheckOutDate(),
                    booking.getCheckOutDate().toEpochDay() - booking.getCheckInDate().toEpochDay(),
                    booking.getTotalAmount()),
                    new EmailService.ConfirmationDetails(
                            paid ? "Your booking is confirmed and the payment has been received."
                                 : "Your booking is confirmed. You pay at the hotel.",
                            paid ? "Total paid" : "Total to pay at the hotel",
                            total,
                            hotel != null ? trimToNull(hotel.getCheckInTime(), 10) : null,
                            hotel != null ? trimToNull(hotel.getCheckOutTime(), 10) : null,
                            manageLink));
        } catch (Exception e) {
            log.warn("Confirmation email failed for booking {}: {}", booking.getId(), e.getMessage());
        }
    }

    private void notifyReception(Booking booking, String title) {
        try {
            notificationService.create("BOOKING_CREATED", title,
                    "Booking #" + referenceOf(booking) + " — room " + booking.getRoomNumber() + ", "
                            + booking.getCheckInDate() + " → " + booking.getCheckOutDate(), "RECEPTION");
        } catch (Exception e) {
            log.warn("Notification failed for booking {}: {}", booking.getId(), e.getMessage());
        }
    }

    private BookingConfirmation confirmationOf(Booking b, String option) {
        Room room = b.getRoom();
        com.booksys.hotel.Hotel hotel = room != null ? room.getHotel() : null;
        return new BookingConfirmation(
                b.getId(), referenceOf(b), b.getGuestName(),
                b.getGuest() != null ? b.getGuest().getEmail() : null,
                hotel != null ? hotel.getName() : "",
                b.getRoomNumber(), b.getCheckInDate(), b.getCheckOutDate(),
                b.getTotalAmount(), currencyOf(b),
                b.getBookingStatus().name(), b.getPaymentStatus().name(), option,
                hotel != null ? trimToNull(hotel.getCheckInTime(), 10) : null,
                hotel != null ? trimToNull(hotel.getCheckOutTime(), 10) : null,
                manageTokenFor(b));
    }

    /** Booking-scoped manage token, valid until 30 days after check-out. */
    private String manageTokenFor(Booking b) {
        LocalDate until = (b.getCheckOutDate() != null ? b.getCheckOutDate() : LocalDate.now()).plusDays(30);
        return manageTokens.forBooking(b.getId(), until.atStartOfDay(java.time.ZoneOffset.UTC).toInstant());
    }

    /** Short reference printed on emails and invoices. */
    static String referenceOf(Booking b) {
        return b.getId().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    /** "€237.50" for EUR, otherwise "237.50 CHF". */
    static String formatMoney(BigDecimal amount, String currency) {
        String value = (amount != null ? amount : BigDecimal.ZERO)
                .setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
        return "EUR".equals(currency) ? "€" + value : value + " " + currency;
    }

    private static String currencyOf(Booking b) {
        Room room = b.getRoom();
        String c = room != null && room.getHotel() != null ? room.getHotel().getCurrency() : null;
        return c == null || c.isBlank() ? "EUR" : c.trim().toUpperCase(Locale.ROOT);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String trimToNull(String s, int max) {
        if (s == null || s.isBlank()) return null;
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }

    /** Exposed for the scheduler and tests. */
    BigDecimal outstanding(Booking booking) {
        return paymentSync.outstanding(booking);
    }
}
