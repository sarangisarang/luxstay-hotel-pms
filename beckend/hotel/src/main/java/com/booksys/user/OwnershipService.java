package com.booksys.user;

import com.booksys.booking.BookingRepository;
import com.booksys.invoice.InvoiceRepository;
import com.booksys.payment.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Central ownership guard for resource-level access control.
 *
 * ADMIN and RECEPTION roles pass through unconditionally.
 * USER role must own the resource (linked via Guest → AppUser → email).
 */
@Service
@RequiredArgsConstructor
public class OwnershipService {

    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    public void requireBookingAccess(UUID bookingId, Authentication auth) {
        if (isPrivileged(auth)) return;
        if (!bookingRepository.existsByIdAndGuestAppUserEmail(bookingId, auth.getName())) {
            throw new AccessDeniedException("Access denied to booking " + bookingId);
        }
    }

    public void requireInvoiceAccess(UUID invoiceId, Authentication auth) {
        if (isPrivileged(auth)) return;
        if (!invoiceRepository.existsByIdAndBookingGuestAppUserEmail(invoiceId, auth.getName())) {
            throw new AccessDeniedException("Access denied to invoice " + invoiceId);
        }
    }

    public void requireInvoiceAccessByBooking(UUID bookingId, Authentication auth) {
        if (isPrivileged(auth)) return;
        if (!invoiceRepository.existsByBookingIdAndBookingGuestAppUserEmail(bookingId, auth.getName())) {
            throw new AccessDeniedException("Access denied to invoice for booking " + bookingId);
        }
    }

    public void requirePaymentAccess(UUID paymentId, Authentication auth) {
        if (isPrivileged(auth)) return;
        if (!paymentRepository.existsByIdAndBookingGuestAppUserEmail(paymentId, auth.getName())) {
            throw new AccessDeniedException("Access denied to payment " + paymentId);
        }
    }

    public void requirePaymentAccessByBooking(UUID bookingId, Authentication auth) {
        if (isPrivileged(auth)) return;
        if (!paymentRepository.existsByBookingIdAndBookingGuestAppUserEmail(bookingId, auth.getName())) {
            throw new AccessDeniedException("Access denied to payment for booking " + bookingId);
        }
    }

    private boolean isPrivileged(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_RECEPTION"));
    }
}
