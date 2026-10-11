package com.booksys.payment;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.guest.Guest;
import com.booksys.invoice.InvoiceRepository;
import com.booksys.invoice.InvoiceStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

/**
 * Keeps the three money views of a booking consistent: its payment rows, the
 * denormalised {@code booking.paymentStatus} and the invoice status.
 *
 * <p>Before this existed, marking an invoice as paid left the payment PENDING
 * and the booking UNPAID, and every report disagreed with the others. All
 * code paths that receive money now end in {@link #recalculate(Booking)}.</p>
 *
 * <p>Depends on repositories only (not on the payment or invoice services),
 * so both of those services can use it without a dependency cycle.</p>
 */
@Component
@RequiredArgsConstructor
public class BookingPaymentSync {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;

    /** Money actually received for a booking (sum of PAID payment rows). */
    public BigDecimal paidAmount(Booking booking) {
        return paymentRepository.findByBookingId(booking.getId()).stream()
                .filter(p -> p.getStatus() == PaymentStatus.PAID)
                .map(Payment::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Amount still to be paid; never negative. */
    public BigDecimal outstanding(Booking booking) {
        BigDecimal total = booking.getTotalAmount() == null ? BigDecimal.ZERO : booking.getTotalAmount();
        return total.subtract(paidAmount(booking)).max(BigDecimal.ZERO);
    }

    /** The PENDING placeholder row created together with the booking, if it is still open. */
    public Optional<Payment> pendingPlaceholder(Booking booking) {
        return paymentRepository.findByBookingId(booking.getId()).stream()
                .filter(p -> p.getStatus() == PaymentStatus.PENDING)
                .findFirst();
    }

    /**
     * Derives {@code booking.paymentStatus} from the payment rows and, once the
     * booking is fully paid, marks its invoice as paid and completes a booking
     * whose guest has already checked out. Cancelled bookings are left to the
     * cancellation logic, which flags refunds instead.
     */
    public void recalculate(Booking booking) {
        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            return;
        }
        BigDecimal total = booking.getTotalAmount() == null ? BigDecimal.ZERO : booking.getTotalAmount();
        BigDecimal paid = paidAmount(booking);

        PaymentStatus status;
        if (paid.signum() > 0 && paid.compareTo(total) >= 0) {
            status = PaymentStatus.PAID;
        } else if (paid.signum() > 0) {
            status = PaymentStatus.PARTIALLY_PAID;
        } else if (booking.getBookingStatus() == BookingStatus.CHECKED_OUT
                || booking.getBookingStatus() == BookingStatus.COMPLETED) {
            status = PaymentStatus.UNPAID;
        } else if (booking.getPaymentStatus() == PaymentStatus.FAILED) {
            status = PaymentStatus.FAILED;
        } else {
            status = PaymentStatus.PENDING;
        }
        booking.setPaymentStatus(status);

        if (status == PaymentStatus.PAID && booking.getBookingStatus() == BookingStatus.CHECKED_OUT) {
            booking.setBookingStatus(BookingStatus.COMPLETED);
        }
        bookingRepository.save(booking);

        if (status == PaymentStatus.PAID) {
            invoiceRepository.findByBookingId(booking.getId()).ifPresent(invoice -> {
                InvoiceStatus s = invoice.getStatus();
                if (s == InvoiceStatus.GENERATED || s == InvoiceStatus.UNPAID || s == InvoiceStatus.SENT) {
                    invoice.setStatus(InvoiceStatus.PAID);
                    invoiceRepository.save(invoice);
                }
            });
        }
    }

    /**
     * Records the whole outstanding balance as received, e.g. when reception
     * marks the invoice as paid. The open placeholder row is completed instead
     * of adding a second one; nothing is recorded when nothing is outstanding.
     *
     * @param method payment method to record, e.g. "INVOICE"
     */
    public void settleOutstanding(Booking booking, String method) {
        BigDecimal outstanding = outstanding(booking);
        if (outstanding.signum() > 0) {
            Payment payment = pendingPlaceholder(booking).orElseGet(() -> newPaymentFor(booking));
            payment.setAmount(outstanding);
            payment.setPaymentMethod(method);
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaymentDate(LocalDateTime.now());
            paymentRepository.save(payment);
        }
        recalculate(booking);
    }

    /** A new payment row for a booking with the guest details copied over. */
    public static Payment newPaymentFor(Booking booking) {
        Payment payment = new Payment();
        payment.setBooking(booking);
        Guest guest = booking.getGuest();
        if (guest != null) {
            payment.setGuestId(guest.getId());
            payment.setGuestName(((guest.getFirstName() == null ? "" : guest.getFirstName()) + " "
                    + (guest.getLastName() == null ? "" : guest.getLastName())).trim());
            payment.setGuestEmail(guest.getEmail());
            payment.setGuestAddress(guest.getAddress());
        }
        return payment;
    }
}
