package com.booksys.booking;

import com.booksys.booking.OnlineBookingDtos.BookingConfirmation;
import com.booksys.booking.OnlineBookingDtos.BookingRequest;
import com.booksys.booking.OnlineBookingDtos.StripeCheckout;
import com.booksys.email.EmailService;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import com.booksys.hotel.Hotel;
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
import com.booksys.stripe.StripeService;
import com.booksys.voucher.VoucherRepository;
import com.booksys.voucher.VoucherService;
import com.stripe.model.PaymentIntent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Website bookings: nothing may end up PAID unless Stripe received exactly the
 * booking total, and anonymous bookings are limited so nobody can block the hotel.
 */
@ExtendWith(MockitoExtension.class)
class OnlineBookingServiceTest {

    @Mock BookingRepository bookingRepository;
    @Mock RoomRepository roomRepository;
    @Mock GuestRepository guestRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock VoucherRepository voucherRepository;
    @Mock BookingQuoteService quoteService;
    @Mock VoucherService voucherService;
    @Mock BookingPaymentSync paymentSync;
    @Mock StripeService stripeService;
    @Mock EmailService emailService;
    @Mock NotificationService notificationService;

    Room room;
    LocalDate checkIn;
    LocalDate checkOut;
    List<Payment> savedPayments;

    private OnlineBookingService service(boolean payAtHotel, boolean stripe) {
        return new OnlineBookingService(bookingRepository, roomRepository, guestRepository, paymentRepository,
                voucherRepository, quoteService, voucherService, paymentSync, stripeService, emailService,
                notificationService,
                new OnlineBookingSettings(payAtHotel, 30, 550, 3, stripe, 30, "pk_test_123"));
    }

    @BeforeEach
    void setUp() {
        Hotel hotel = new Hotel();
        hotel.setName("Test Hotel");
        hotel.setCurrency("EUR");
        room = new Room();
        room.setId(UUID.randomUUID());
        room.setRoomNumber(101);
        room.setRoomStatus(RoomStatus.FREE);
        room.setHotel(hotel);
        checkIn = LocalDate.now().plusDays(10);
        checkOut = checkIn.plusDays(2);
        savedPayments = new ArrayList<>();

        lenient().when(roomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.of(room));
        lenient().when(quoteService.loadServices(any())).thenReturn(new ArrayList<>());
        lenient().when(quoteService.quote(eq(room), any(), any(), any(), any())).thenAnswer(inv -> new BookingQuote(
                room.getId(), UUID.randomUUID(), inv.getArgument(1), inv.getArgument(2), 2, List.of(),
                new BigDecimal("200.00"), List.of(), BigDecimal.ZERO.setScale(2), null, null,
                BigDecimal.ZERO.setScale(2), new BigDecimal("200.00"), "EUR"));
        lenient().when(guestRepository.findFirstByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        lenient().when(guestRepository.save(any(Guest.class))).thenAnswer(inv -> {
            Guest g = inv.getArgument(0);
            g.setId(UUID.randomUUID());
            return g;
        });
        lenient().when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            if (b.getId() == null) b.setId(UUID.randomUUID());
            if (b.getCreatedAt() == null) b.setCreatedAt(LocalDateTime.now());
            return b;
        });
        lenient().when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            if (!savedPayments.contains(p)) savedPayments.add(p);
            return p;
        });
    }

    private BookingRequest request(String email) {
        return new BookingRequest(room.getId(), checkIn, checkOut, "Anna", "Schmidt", email,
                "+49 170 000", List.of(), null, null);
    }

    // ── Pay at hotel ─────────────────────────────────────────────────────────

    @Test
    void payAtHotelIsConfirmedButNeverMarkedPaid() {
        BookingConfirmation c = service(true, false).bookPayAtHotel(request("Anna@Example.org"));

        assertThat(c.bookingStatus()).isEqualTo("CONFIRMED");
        assertThat(c.paymentStatus()).isEqualTo("PENDING");
        assertThat(c.total()).isEqualByComparingTo("200.00");
        assertThat(savedPayments).singleElement().satisfies(p -> {
            assertThat(p.getStatus()).isEqualTo(PaymentStatus.PENDING);
            assertThat(p.getPaymentMethod()).isEqualTo("PAY_AT_HOTEL");
        });
        // Email is normalised before the guest is stored
        ArgumentCaptor<Guest> guest = ArgumentCaptor.forClass(Guest.class);
        verify(guestRepository).save(guest.capture());
        assertThat(guest.getValue().getEmail()).isEqualTo("anna@example.org");
        // Booking a future stay does not change today's room status
        assertThat(room.getRoomStatus()).isEqualTo(RoomStatus.FREE);
    }

    @Test
    void payAtHotelCanBeSwitchedOff() {
        assertThatThrownBy(() -> service(false, true).bookPayAtHotel(request("a@b.de")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void invalidGuestDataAndStaysAreRejected() {
        OnlineBookingService s = service(true, false);
        assertThatThrownBy(() -> s.bookPayAtHotel(request("not-an-email")))
                .isInstanceOf(IllegalArgumentException.class);

        BookingRequest tooLong = new BookingRequest(room.getId(), checkIn, checkIn.plusDays(31),
                "Anna", "Schmidt", "a@b.de", null, List.of(), null, null);
        assertThatThrownBy(() -> s.bookPayAtHotel(tooLong))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("30 nights");

        BookingRequest past = new BookingRequest(room.getId(), LocalDate.now().minusDays(1), checkOut,
                "Anna", "Schmidt", "a@b.de", null, List.of(), null, null);
        assertThatThrownBy(() -> s.bookPayAtHotel(past)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void oneEmailCannotBlockTheWholeHotel() {
        when(bookingRepository.countOpenBookingsForEmail(eq("a@b.de"), any())).thenReturn(3L);

        assertThatThrownBy(() -> service(true, false).bookPayAtHotel(request("a@b.de")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("maximum number of open online bookings");
    }

    @Test
    void takenRoomIsRejectedUnderTheLock() {
        when(bookingRepository.existsOverlappingBooking(room.getId(), checkIn, checkOut)).thenReturn(true);

        assertThatThrownBy(() -> service(true, false).bookPayAtHotel(request("a@b.de")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no longer available");
        verify(bookingRepository, never()).save(any());
    }

    // ── Stripe ───────────────────────────────────────────────────────────────

    private Booking heldBooking(String piId) {
        Booking b = new Booking();
        b.setId(UUID.randomUUID());
        b.setRoom(room);
        b.setRoomNumber(101);
        b.setGuestName("Anna Schmidt");
        Guest g = new Guest();
        g.setEmail("a@b.de");
        b.setGuest(g);
        b.setCheckInDate(checkIn);
        b.setCheckOutDate(checkOut);
        b.setTotalAmount(new BigDecimal("200.00"));
        b.setBookingStatus(BookingStatus.PENDING);
        b.setPaymentStatus(PaymentStatus.PENDING);
        b.setStripePaymentIntentId(piId);
        b.setCreatedAt(LocalDateTime.now());
        return b;
    }

    private PaymentIntent intent(String id, String status, long amount, String currency, String bookingId) {
        PaymentIntent pi = new PaymentIntent();
        pi.setId(id);
        pi.setStatus(status);
        pi.setAmount(amount);
        pi.setAmountReceived("succeeded".equals(status) ? amount : 0L);
        pi.setCurrency(currency);
        pi.setMetadata(Map.of("bookingId", bookingId));
        pi.setClientSecret(id + "_secret");
        return pi;
    }

    @Test
    void stripeCheckoutChargesTheServerSideTotal() throws Exception {
        when(stripeService.createPaymentIntent(anyLong(), anyString(), anyString(), anyMap(), anyString()))
                .thenAnswer(inv -> intent("pi_1", "requires_payment_method", inv.getArgument(0), "eur", "x"));

        StripeCheckout co = service(true, true).startStripeCheckout(request("a@b.de"));

        verify(stripeService).createPaymentIntent(eq(20000L), eq("EUR"), anyString(), anyMap(), anyString());
        assertThat(co.clientSecret()).isEqualTo("pi_1_secret");
        assertThat(co.amount()).isEqualByComparingTo("200.00");
    }

    @Test
    void onlinePaymentIsRefusedWhileStripeIsOff() {
        assertThatThrownBy(() -> service(true, false).startStripeCheckout(request("a@b.de")))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> service(true, false).confirmStripePayment("pi_1"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void successfulPaymentOfTheFullAmountConfirmsTheBooking() throws Exception {
        Booking b = heldBooking("pi_ok");
        when(bookingRepository.findByStripePaymentIntentIdForUpdate("pi_ok")).thenReturn(Optional.of(b));
        when(stripeService.retrieve("pi_ok")).thenReturn(intent("pi_ok", "succeeded", 20000L, "eur", b.getId().toString()));
        when(paymentSync.pendingPlaceholder(b)).thenReturn(Optional.empty());

        BookingConfirmation c = service(true, true).confirmStripePayment("pi_ok");

        assertThat(c.bookingStatus()).isEqualTo("CONFIRMED");
        assertThat(savedPayments).singleElement().satisfies(p -> {
            assertThat(p.getStatus()).isEqualTo(PaymentStatus.PAID);
            assertThat(p.getExternalReference()).isEqualTo("pi_ok");
        });
        verify(paymentSync).recalculate(b);
    }

    @Test
    void underpaymentWrongCurrencyOrForeignIntentIsRejected() throws Exception {
        Booking b = heldBooking("pi_x");
        when(bookingRepository.findByStripePaymentIntentIdForUpdate("pi_x")).thenReturn(Optional.of(b));
        OnlineBookingService s = service(true, true);

        when(stripeService.retrieve("pi_x")).thenReturn(intent("pi_x", "succeeded", 50L, "eur", b.getId().toString()));
        assertThatThrownBy(() -> s.confirmStripePayment("pi_x"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("amount");

        when(stripeService.retrieve("pi_x")).thenReturn(intent("pi_x", "succeeded", 20000L, "usd", b.getId().toString()));
        assertThatThrownBy(() -> s.confirmStripePayment("pi_x"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("currency");

        when(stripeService.retrieve("pi_x")).thenReturn(intent("pi_x", "succeeded", 20000L, "eur", UUID.randomUUID().toString()));
        assertThatThrownBy(() -> s.confirmStripePayment("pi_x"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("does not belong");

        when(stripeService.retrieve("pi_x")).thenReturn(intent("pi_x", "requires_payment_method", 20000L, "eur", b.getId().toString()));
        assertThatThrownBy(() -> s.confirmStripePayment("pi_x")).isInstanceOf(IllegalStateException.class);

        assertThat(savedPayments).isEmpty();
        assertThat(b.getBookingStatus()).isEqualTo(BookingStatus.PENDING);
    }

    @Test
    void confirmingTwiceIsHarmless() throws Exception {
        Booking b = heldBooking("pi_done");
        b.setBookingStatus(BookingStatus.CONFIRMED);
        b.setPaymentStatus(PaymentStatus.PAID);
        when(bookingRepository.findByStripePaymentIntentIdForUpdate("pi_done")).thenReturn(Optional.of(b));

        BookingConfirmation c = service(true, true).confirmStripePayment("pi_done");

        assertThat(c.paymentStatus()).isEqualTo("PAID");
        verify(stripeService, never()).retrieve(anyString());
        assertThat(savedPayments).isEmpty();
    }

    @Test
    void paymentAfterTheHoldExpiredIsFlaggedForRefund() throws Exception {
        Booking b = heldBooking("pi_late");
        b.setBookingStatus(BookingStatus.CANCELLED);
        when(bookingRepository.findByStripePaymentIntentIdForUpdate("pi_late")).thenReturn(Optional.of(b));
        when(stripeService.retrieve("pi_late")).thenReturn(intent("pi_late", "succeeded", 20000L, "eur", b.getId().toString()));
        when(paymentSync.pendingPlaceholder(b)).thenReturn(Optional.empty());

        BookingConfirmation c = service(true, true).confirmStripePayment("pi_late");

        assertThat(c.bookingStatus()).isEqualTo("CANCELLED");
        assertThat(c.paymentStatus()).isEqualTo("REFUND_REQUIRED");
        verify(notificationService).create(eq("PAYMENT_AFTER_EXPIRY"), anyString(), anyString(), eq("ADMIN"));
    }

    @Test
    void expiryJobConfirmsLatePaymentsSkipsProcessingAndReleasesTheRest() throws Exception {
        Booking paid = heldBooking("pi_paid");
        Booking processing = heldBooking("pi_proc");
        Booking abandoned = heldBooking("pi_gone");
        when(bookingRepository.findStaleOnlineHolds(any())).thenReturn(List.of(paid, processing, abandoned));
        when(bookingRepository.findByStripePaymentIntentIdForUpdate("pi_paid")).thenReturn(Optional.of(paid));
        when(stripeService.retrieve("pi_paid")).thenReturn(intent("pi_paid", "succeeded", 20000L, "eur", paid.getId().toString()));
        when(stripeService.retrieve("pi_proc")).thenReturn(intent("pi_proc", "processing", 20000L, "eur", processing.getId().toString()));
        PaymentIntent gone = intent("pi_gone", "requires_payment_method", 20000L, "eur", abandoned.getId().toString());
        when(stripeService.retrieve("pi_gone")).thenReturn(gone);
        when(paymentSync.pendingPlaceholder(paid)).thenReturn(Optional.empty());

        int released = service(true, true).expireStaleStripeHolds();

        assertThat(released).isEqualTo(1);
        assertThat(paid.getBookingStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(processing.getBookingStatus()).isEqualTo(BookingStatus.PENDING);
        assertThat(abandoned.getBookingStatus()).isEqualTo(BookingStatus.CANCELLED);
        verify(stripeService).cancelIfPossible(gone);
    }
}
