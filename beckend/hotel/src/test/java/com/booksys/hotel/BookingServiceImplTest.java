package com.booksys.hotel;

import com.booksys.auditlog.ChangeLogService;
import com.booksys.booking.*;
import com.booksys.email.BookingEmailData;
import com.booksys.email.EmailService;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import com.booksys.invoice.Invoice;
import com.booksys.invoice.InvoiceRepository;
import com.booksys.invoice.InvoiceStatus;
import com.booksys.notification.NotificationService;
import com.booksys.payment.Payment;
import com.booksys.payment.PaymentRepository;
import com.booksys.payment.PaymentStatus;
import com.booksys.pricing.DynamicPricingService;
import com.booksys.room.Room;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import com.booksys.roomtype.RoomType;
import com.booksys.service.ServiceRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class BookingServiceImplTest {

    @Mock BookingRepository     bookingRepository;
    @Mock GuestRepository       guestRepository;
    @Mock RoomRepository        roomRepository;
    @Mock ServiceRepository     serviceRepository;
    @Mock BookingMapper         bookingMapper;
    @Mock DynamicPricingService dynamicPricingService;
    @Mock EmailService          emailService;
    @Mock PaymentRepository     paymentRepository;
    @Mock InvoiceRepository     invoiceRepository;
    @Mock NotificationService   notificationService;
    @Mock ChangeLogService      changeLogService;

    @InjectMocks BookingServiceImpl service;

    private Guest     guest;
    private RoomType  roomType;
    private Room      room;
    private UUID      guestId, roomId;

    @BeforeEach
    void setUp() {
        guestId  = UUID.randomUUID();
        roomId   = UUID.randomUUID();

        guest = new Guest();
        guest.setId(guestId);
        guest.setFirstName("Ana");
        guest.setLastName("Test");
        guest.setEmail("ana@test.com");

        roomType = new RoomType();
        roomType.setPricePerNight(new BigDecimal("100.00"));

        room = new Room();
        room.setId(roomId);
        room.setRoomType(roomType);
        room.setRoomStatus(RoomStatus.FREE);
    }

    // ── createBooking ─────────────────────────────────────────────────────────

    @Test
    void createBookingRejectsNullGuestId() {
        BookingDTO dto = new BookingDTO();
        dto.setRoomId(roomId);
        dto.setCheckInDate(LocalDate.now());
        dto.setCheckOutDate(LocalDate.now().plusDays(2));

        assertThatThrownBy(() -> service.createBooking(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Guest ID");
    }

    @Test
    void createBookingRejectsNullRoomId() {
        BookingDTO dto = new BookingDTO();
        dto.setGuestId(guestId);
        dto.setCheckInDate(LocalDate.now());
        dto.setCheckOutDate(LocalDate.now().plusDays(2));

        assertThatThrownBy(() -> service.createBooking(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Room ID");
    }

    @Test
    void createBookingRejectsPastCheckInDate() {
        BookingDTO dto = new BookingDTO();
        dto.setGuestId(guestId);
        dto.setRoomId(roomId);
        dto.setCheckInDate(LocalDate.now().minusDays(1));
        dto.setCheckOutDate(LocalDate.now().plusDays(1));

        assertThatThrownBy(() -> service.createBooking(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("past");
    }

    @Test
    void createBookingRejectsCheckOutBeforeCheckIn() {
        BookingDTO dto = new BookingDTO();
        dto.setGuestId(guestId);
        dto.setRoomId(roomId);
        dto.setCheckInDate(LocalDate.now().plusDays(3));
        dto.setCheckOutDate(LocalDate.now().plusDays(1));

        assertThatThrownBy(() -> service.createBooking(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Check-out date must be after");
    }

    @Test
    void createBookingThrowsWhenGuestNotFound() {
        BookingDTO dto = validDto();
        when(guestRepository.findById(guestId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createBooking(dto))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Guest not found");
    }

    @Test
    void createBookingThrowsWhenRoomUnavailable() {
        BookingDTO dto = validDto();
        when(guestRepository.findById(guestId)).thenReturn(Optional.of(guest));
        when(roomRepository.findByIdForUpdate(roomId)).thenReturn(Optional.of(room));
        when(bookingRepository.existsOverlappingBooking(eq(roomId), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> service.createBooking(dto))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not available");
    }

    @Test
    void createBookingPersistsAndReturnsMappedDto() {
        BookingDTO dto    = validDto();
        BookingDTO mapped = new BookingDTO();
        mapped.setId(UUID.randomUUID());

        when(guestRepository.findById(guestId)).thenReturn(Optional.of(guest));
        when(roomRepository.findByIdForUpdate(roomId)).thenReturn(Optional.of(room));
        when(bookingRepository.existsOverlappingBooking(eq(roomId), any(), any())).thenReturn(false);
        when(dynamicPricingService.calculateTotal(any(), any(), any())).thenReturn(new BigDecimal("200.00"));

        Booking saved = new Booking();
        saved.setId(UUID.randomUUID());
        saved.setRoom(room);
        saved.setGuest(guest);
        saved.setCheckInDate(dto.getCheckInDate());
        saved.setCheckOutDate(dto.getCheckOutDate());
        saved.setTotalAmount(new BigDecimal("200.00"));

        when(bookingMapper.toEntity(any(), any(), any(), any())).thenReturn(saved);
        when(bookingRepository.save(saved)).thenReturn(saved);
        when(bookingMapper.toDto(saved)).thenReturn(mapped);

        BookingDTO result = service.createBooking(dto);

        assertThat(result).isSameAs(mapped);
        verify(roomRepository).save(room);
        assertThat(room.getRoomStatus()).isEqualTo(RoomStatus.RESERVED);
        // Payment record created automatically
        verify(paymentRepository).save(any(Payment.class));
    }

    // ── checkIn ───────────────────────────────────────────────────────────────

    @Test
    void checkInTransitionsStatusAndMarksOccupied() {
        Booking booking = pendingBookingWithRoom();
        booking.setCheckInDate(LocalDate.now());           // today — passes date guard
        booking.setCheckOutDate(LocalDate.now().plusDays(2));
        UUID bid = booking.getId();

        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(booking)).thenReturn(booking);
        when(bookingMapper.toDto(booking)).thenReturn(new BookingDTO());

        service.checkIn(bid);

        assertThat(booking.getBookingStatus()).isEqualTo(BookingStatus.CHECKED_IN);
        assertThat(booking.getRoom().getRoomStatus()).isEqualTo(RoomStatus.OCCUPIED);
        verify(roomRepository).save(room);
    }

    @Test
    @DisplayName("H3-1: checkIn before check-in date is rejected")
    void checkInRejectsEarlyArrival() {
        Booking booking = pendingBookingWithRoom();
        booking.setCheckInDate(LocalDate.now().plusDays(5)); // future booking
        booking.setCheckOutDate(LocalDate.now().plusDays(7));
        UUID bid = booking.getId();
        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.checkIn(bid))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Too early");
    }

    @Test
    @DisplayName("H3-2: checkIn on or after checkout date is rejected")
    void checkInRejectsAfterCheckoutDate() {
        Booking booking = pendingBookingWithRoom();
        booking.setCheckInDate(LocalDate.now().minusDays(3)); // started in past
        booking.setCheckOutDate(LocalDate.now());              // checkout is today → already passed
        UUID bid = booking.getId();
        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.checkIn(bid))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("passed");
    }

    @Test
    @DisplayName("H3-3: checkIn on the check-in date succeeds")
    void checkInAcceptsOnCheckInDate() {
        Booking booking = pendingBookingWithRoom();
        booking.setCheckInDate(LocalDate.now());
        booking.setCheckOutDate(LocalDate.now().plusDays(2));
        UUID bid = booking.getId();

        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(booking)).thenReturn(booking);
        when(bookingMapper.toDto(booking)).thenReturn(new BookingDTO());

        service.checkIn(bid);

        assertThat(booking.getBookingStatus()).isEqualTo(BookingStatus.CHECKED_IN);
    }

    @Test
    void checkInRejectsCancelledBooking() {
        Booking booking = pendingBookingWithRoom();
        booking.setBookingStatus(BookingStatus.CANCELLED);
        UUID bid = booking.getId();
        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.checkIn(bid))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("cancelled");
    }

    // ── checkOut ──────────────────────────────────────────────────────────────

    @Test
    void checkOutFreesRoomAndSetsCheckedOut() {
        Booking booking = pendingBookingWithRoom();
        booking.setBookingStatus(BookingStatus.CHECKED_IN);
        booking.setPaymentStatus(PaymentStatus.PENDING);
        UUID bid = booking.getId();

        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(booking)).thenReturn(booking);
        when(bookingMapper.toDto(booking)).thenReturn(new BookingDTO());

        service.checkOut(bid);

        assertThat(booking.getBookingStatus()).isEqualTo(BookingStatus.CHECKED_OUT);
        assertThat(booking.getRoom().getRoomStatus()).isEqualTo(RoomStatus.FREE);
    }

    @Test
    void checkOutSetsCompletedWhenAlreadyPaid() {
        Booking booking = pendingBookingWithRoom();
        booking.setBookingStatus(BookingStatus.CHECKED_IN);
        booking.setPaymentStatus(PaymentStatus.PAID);
        UUID bid = booking.getId();

        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(booking)).thenReturn(booking);
        when(bookingMapper.toDto(booking)).thenReturn(new BookingDTO());

        service.checkOut(bid);

        assertThat(booking.getBookingStatus()).isEqualTo(BookingStatus.COMPLETED);
    }

    // ── cancelBooking — H2 verification matrix ────────────────────────────────

    @Test
    @DisplayName("H2-1: PENDING payment → CANCELLED, UNPAID invoice → CANCELLED, room freed")
    void cancelBooking_pendingPayment_unpaidInvoice_allCancelled() {
        Booking booking = reservedBookingWithRoom();
        UUID bid = booking.getId();

        Payment payment = paymentOf(bid, PaymentStatus.PENDING);
        Invoice invoice = invoiceOf(bid, InvoiceStatus.UNPAID);

        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(booking)).thenReturn(booking);
        when(bookingMapper.toDto(booking)).thenReturn(new BookingDTO());
        when(paymentRepository.findByBookingId(bid)).thenReturn(List.of(payment));
        when(invoiceRepository.findByBookingId(bid)).thenReturn(Optional.of(invoice));

        service.cancelBooking(bid);

        assertThat(booking.getBookingStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(booking.getPaymentStatus()).isEqualTo(PaymentStatus.CANCELLED); // denormalized field synced
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
        assertThat(room.getRoomStatus()).isEqualTo(RoomStatus.FREE);
        verify(roomRepository).save(room);
    }

    @Test
    @DisplayName("H2-2: PAID payment → REFUND_REQUIRED (not REFUNDED), PAID invoice → CREDIT_NOTE_REQUIRED")
    void cancelBooking_paidPayment_paidInvoice_refundRequired_creditNoteRequired() {
        Booking booking = reservedBookingWithRoom();
        UUID bid = booking.getId();

        Payment payment = paymentOf(bid, PaymentStatus.PAID);
        Invoice invoice = invoiceOf(bid, InvoiceStatus.PAID);

        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(booking)).thenReturn(booking);
        when(bookingMapper.toDto(booking)).thenReturn(new BookingDTO());
        when(paymentRepository.findByBookingId(bid)).thenReturn(List.of(payment));
        when(invoiceRepository.findByBookingId(bid)).thenReturn(Optional.of(invoice));

        service.cancelBooking(bid);

        // Key accounting rule: PAID → REFUND_REQUIRED, never falsely REFUNDED
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REFUND_REQUIRED);
        assertThat(payment.getStatus()).isNotEqualTo(PaymentStatus.REFUNDED);

        // Denormalized booking.paymentStatus must also mirror the worst payment state
        assertThat(booking.getPaymentStatus()).isEqualTo(PaymentStatus.REFUND_REQUIRED);

        // Key accounting rule: PAID invoice → CREDIT_NOTE_REQUIRED, not simply CANCELLED
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.CREDIT_NOTE_REQUIRED);
        assertThat(invoice.getStatus()).isNotEqualTo(InvoiceStatus.CANCELLED);
    }

    @Test
    @DisplayName("H2-3: Already CANCELLED booking is idempotent — no duplicate state changes")
    void cancelBooking_alreadyCancelled_isIdempotent() {
        Booking booking = reservedBookingWithRoom();
        booking.setBookingStatus(BookingStatus.CANCELLED);
        UUID bid = booking.getId();

        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));
        when(bookingMapper.toDto(booking)).thenReturn(new BookingDTO());

        service.cancelBooking(bid);

        // No payment or invoice queries — idempotent early return
        verify(paymentRepository, never()).findByBookingId(any());
        verify(invoiceRepository, never()).findByBookingId(any());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("H2-4: CHECKED_IN booking cannot be cancelled — must check out first")
    void cancelBooking_checkedIn_throws() {
        Booking booking = reservedBookingWithRoom();
        booking.setBookingStatus(BookingStatus.CHECKED_IN);
        UUID bid = booking.getId();

        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> service.cancelBooking(bid))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("check-out");

        // Booking status must not have changed
        assertThat(booking.getBookingStatus()).isEqualTo(BookingStatus.CHECKED_IN);
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("H2-5: GENERATED invoice → CANCELLED on cancellation")
    void cancelBooking_generatedInvoice_becomesCANCELLED() {
        Booking booking = reservedBookingWithRoom();
        UUID bid = booking.getId();

        Invoice invoice = invoiceOf(bid, InvoiceStatus.GENERATED);

        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(booking)).thenReturn(booking);
        when(bookingMapper.toDto(booking)).thenReturn(new BookingDTO());
        when(paymentRepository.findByBookingId(bid)).thenReturn(List.of());
        when(invoiceRepository.findByBookingId(bid)).thenReturn(Optional.of(invoice));

        service.cancelBooking(bid);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
    }

    @Test
    @DisplayName("H2-5b: No invoice for booking — cancellation proceeds without error")
    void cancelBooking_noInvoice_noError() {
        Booking booking = reservedBookingWithRoom();
        UUID bid = booking.getId();

        when(bookingRepository.findById(bid)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(booking)).thenReturn(booking);
        when(bookingMapper.toDto(booking)).thenReturn(new BookingDTO());
        when(paymentRepository.findByBookingId(bid)).thenReturn(List.of());
        when(invoiceRepository.findByBookingId(bid)).thenReturn(Optional.empty());

        assertThatCode(() -> service.cancelBooking(bid)).doesNotThrowAnyException();
        assertThat(booking.getBookingStatus()).isEqualTo(BookingStatus.CANCELLED);
    }

    // ── deleteBooking ─────────────────────────────────────────────────────────

    @Test
    void deleteBookingThrowsWhenNotFound() {
        UUID bid = UUID.randomUUID();
        when(bookingRepository.existsById(bid)).thenReturn(false);

        assertThatThrownBy(() -> service.deleteBooking(bid))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private BookingDTO validDto() {
        BookingDTO dto = new BookingDTO();
        dto.setGuestId(guestId);
        dto.setRoomId(roomId);
        dto.setCheckInDate(LocalDate.now().plusDays(1));
        dto.setCheckOutDate(LocalDate.now().plusDays(3));
        return dto;
    }

    private Booking pendingBookingWithRoom() {
        Booking b = new Booking();
        b.setId(UUID.randomUUID());
        b.setRoom(room);
        b.setGuest(guest);
        b.setCheckInDate(LocalDate.now().plusDays(1));
        b.setCheckOutDate(LocalDate.now().plusDays(3));
        b.setBookingStatus(BookingStatus.PENDING);
        b.setPaymentStatus(PaymentStatus.PENDING);
        return b;
    }

    private Booking reservedBookingWithRoom() {
        room.setRoomStatus(RoomStatus.RESERVED);
        Booking b = new Booking();
        b.setId(UUID.randomUUID());
        b.setRoom(room);
        b.setGuest(guest);
        b.setCheckInDate(LocalDate.now().plusDays(1));
        b.setCheckOutDate(LocalDate.now().plusDays(3));
        b.setBookingStatus(BookingStatus.CONFIRMED);
        b.setPaymentStatus(PaymentStatus.PENDING);
        return b;
    }

    private Payment paymentOf(UUID bookingId, PaymentStatus status) {
        Payment p = new Payment();
        p.setId(UUID.randomUUID());
        p.setStatus(status);
        p.setAmount(new BigDecimal("200.00"));
        return p;
    }

    private Invoice invoiceOf(UUID bookingId, InvoiceStatus status) {
        Invoice inv = new Invoice();
        inv.setId(UUID.randomUUID());
        inv.setStatus(status);
        return inv;
    }
}
