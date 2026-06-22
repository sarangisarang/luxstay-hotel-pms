package com.booksys.invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;


public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    Optional<Invoice> findByBookingId(UUID bookingId);
    Optional<Object> findByInvoiceNumber(String invoiceNumber);
    boolean existsByIdAndBookingGuestAppUserEmail(UUID id, String email);
    boolean existsByBookingIdAndBookingGuestAppUserEmail(UUID bookingId, String email);
}