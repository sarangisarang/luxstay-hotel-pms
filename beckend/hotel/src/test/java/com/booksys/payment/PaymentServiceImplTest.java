package com.booksys.payment;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.guest.Guest;
import com.booksys.invoice.InvoiceService;
import com.booksys.loyalty.GuestLoyaltyRepository;
import com.booksys.payment.dto.PaymentRequestDTO;
import com.booksys.payment.dto.PaymentResponseDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Recording a payment at reception: the old code inserted a second row next to
 * the booking's placeholder and failed with HTTP 500 on a unique constraint.
 */
@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock BookingRepository bookingRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock InvoiceService invoiceService;
    @Mock GuestLoyaltyRepository loyaltyRepository;
    @Mock BookingPaymentSync paymentSync;

    PaymentServiceImpl service;
    Booking booking;

    @BeforeEach
    void setUp() {
        service = new PaymentServiceImpl(bookingRepository, paymentRepository, invoiceService, loyaltyRepository, paymentSync);
        Guest guest = new Guest();
        guest.setId(UUID.randomUUID());
        guest.setFirstName("Anna");
        guest.setLastName("Schmidt");
        guest.setEmail("anna@example.org");
        booking = new Booking();
        booking.setId(UUID.randomUUID());
        booking.setGuest(guest);
        booking.setTotalAmount(new BigDecimal("190.00"));
        booking.setBookingStatus(BookingStatus.CHECKED_IN);
        lenient().when(bookingRepository.findById(booking.getId())).thenReturn(Optional.of(booking));
        lenient().when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private PaymentRequestDTO request(String amount, String method, String status) {
        PaymentRequestDTO dto = new PaymentRequestDTO();
        dto.setBookingId(booking.getId());
        dto.setAmount(amount == null ? null : new BigDecimal(amount));
        dto.setPaymentMethod(method);
        dto.setStatus(status);
        dto.setPaymentDate(LocalDate.now());
        return dto;
    }

    @Test
    void cashPaymentCompletesThePlaceholderAndRecalculatesTheBooking() {
        Payment placeholder = BookingPaymentSync.newPaymentFor(booking);
        placeholder.setStatus(PaymentStatus.PENDING);
        placeholder.setAmount(new BigDecimal("190.00"));
        placeholder.setPaymentMethod("RECEPTION");
        when(paymentSync.outstanding(booking)).thenReturn(new BigDecimal("190.00"));
        when(paymentSync.pendingPlaceholder(booking)).thenReturn(Optional.of(placeholder));

        PaymentResponseDTO dto = service.savePayment(request("190.00", "CASH", "PAID"));

        assertThat(placeholder.getStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(placeholder.getPaymentMethod()).isEqualTo("CASH");
        assertThat(dto.getStatus()).isEqualTo("PAID");
        verify(paymentSync).recalculate(booking);
    }

    @Test
    void depositCreatesARowAndBalanceCanFollow() {
        when(paymentSync.outstanding(booking)).thenReturn(new BigDecimal("190.00"));
        when(paymentSync.pendingPlaceholder(booking)).thenReturn(Optional.empty());

        PaymentResponseDTO dto = service.savePayment(request("50.00", "CARD", null));

        assertThat(dto.getAmount()).isEqualByComparingTo("50.00");
        assertThat(dto.getStatus()).isEqualTo("PAID");   // default status is PAID
    }

    @Test
    void overpaymentAndDoublePaymentAreRefused() {
        when(paymentSync.outstanding(booking)).thenReturn(new BigDecimal("40.00"));
        assertThatThrownBy(() -> service.savePayment(request("50.00", "CASH", "PAID")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("outstanding balance");

        when(paymentSync.outstanding(booking)).thenReturn(BigDecimal.ZERO);
        assertThatThrownBy(() -> service.savePayment(request("10.00", "CASH", "PAID")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already fully paid");
    }

    @Test
    void invalidInputGivesAClearErrorInsteadOf500() {
        assertThatThrownBy(() -> service.savePayment(request("0", "CASH", "PAID")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.savePayment(request("10.00", " ", "PAID")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.savePayment(request("10.00", "CASH", "REFUNDED")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.savePayment(request("10.00", "CASH", "nonsense")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void cancelledBookingsTakeNoPayments() {
        booking.setBookingStatus(BookingStatus.CANCELLED);
        assertThatThrownBy(() -> service.savePayment(request("10.00", "CASH", "PAID")))
                .isInstanceOf(IllegalStateException.class);
    }
}
