package com.booksys.payment;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.invoice.Invoice;
import com.booksys.invoice.InvoiceRepository;
import com.booksys.invoice.InvoiceStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Booking payment status, payment rows and invoice status must always agree.
 */
@ExtendWith(MockitoExtension.class)
class BookingPaymentSyncTest {

    @Mock PaymentRepository paymentRepository;
    @Mock BookingRepository bookingRepository;
    @Mock InvoiceRepository invoiceRepository;
    @InjectMocks BookingPaymentSync sync;

    Booking booking;
    List<Payment> payments;

    @BeforeEach
    void setUp() {
        booking = new Booking();
        booking.setId(UUID.randomUUID());
        booking.setTotalAmount(new BigDecimal("300.00"));
        booking.setBookingStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus(PaymentStatus.PENDING);
        payments = new ArrayList<>();
        lenient().when(paymentRepository.findByBookingId(booking.getId())).thenReturn(payments);
        lenient().when(invoiceRepository.findByBookingId(booking.getId())).thenReturn(Optional.empty());
    }

    private Payment payment(String amount, PaymentStatus status) {
        Payment p = new Payment();
        p.setAmount(new BigDecimal(amount));
        p.setStatus(status);
        p.setBooking(booking);
        payments.add(p);
        return p;
    }

    @Test
    void depositMakesTheBookingPartiallyPaid() {
        payment("100.00", PaymentStatus.PAID);
        payment("200.00", PaymentStatus.PENDING);

        sync.recalculate(booking);

        assertThat(booking.getPaymentStatus()).isEqualTo(PaymentStatus.PARTIALLY_PAID);
        assertThat(sync.outstanding(booking)).isEqualByComparingTo("200.00");
    }

    @Test
    void fullPaymentMarksBookingAndInvoicePaidAndCompletesACheckedOutStay() {
        booking.setBookingStatus(BookingStatus.CHECKED_OUT);
        payment("100.00", PaymentStatus.PAID);
        payment("200.00", PaymentStatus.PAID);
        Invoice invoice = new Invoice();
        invoice.setStatus(InvoiceStatus.GENERATED);
        when(invoiceRepository.findByBookingId(booking.getId())).thenReturn(Optional.of(invoice));

        sync.recalculate(booking);

        assertThat(booking.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(booking.getBookingStatus()).isEqualTo(BookingStatus.COMPLETED);
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
    }

    @Test
    void settleOutstandingCompletesThePendingPlaceholderInsteadOfAddingARow() {
        Payment deposit = payment("100.00", PaymentStatus.PAID);
        Payment placeholder = payment("300.00", PaymentStatus.PENDING);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        sync.settleOutstanding(booking, "INVOICE");

        assertThat(placeholder.getStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(placeholder.getAmount()).isEqualByComparingTo("200.00");
        assertThat(placeholder.getPaymentMethod()).isEqualTo("INVOICE");
        assertThat(deposit.getAmount()).isEqualByComparingTo("100.00");
        assertThat(payments).hasSize(2);
        assertThat(booking.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    }

    @Test
    void nothingIsRecordedWhenNothingIsOutstanding() {
        payment("300.00", PaymentStatus.PAID);

        sync.settleOutstanding(booking, "INVOICE");

        verify(paymentRepository, never()).save(any(Payment.class));
        assertThat(booking.getPaymentStatus()).isEqualTo(PaymentStatus.PAID);
    }

    @Test
    void cancelledBookingsAreLeftToTheCancellationLogic() {
        booking.setBookingStatus(BookingStatus.CANCELLED);
        booking.setPaymentStatus(PaymentStatus.REFUND_REQUIRED);
        payment("300.00", PaymentStatus.REFUND_REQUIRED);

        sync.recalculate(booking);

        assertThat(booking.getPaymentStatus()).isEqualTo(PaymentStatus.REFUND_REQUIRED);
        verify(bookingRepository, never()).save(any());
    }
}
