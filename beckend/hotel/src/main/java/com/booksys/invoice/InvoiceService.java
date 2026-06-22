package com.booksys.invoice;

import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface InvoiceService {
    org.springframework.data.domain.Page<InvoiceDTO> getAllInvoices(Pageable pageable);
    InvoiceDTO generateInvoice(UUID bookingId);
    InvoiceDTO getInvoiceById(UUID id);
    InvoiceDTO updateInvoice(UUID id, InvoiceDTO invoiceDTO);
    void deleteInvoice(UUID id);
    InvoiceDTO getInvoiceByBookingId(UUID bookingId);
    InvoiceDTO getInvoiceByInvoiceNumber(String invoiceNumber);
    InvoiceDTO markAsPaid(UUID invoiceId);
    InvoiceDTO markAsUnpaid(UUID invoiceId);
    InvoiceDTO markAsCancelled(UUID invoiceId);
    // ✅ new: create if missing, otherwise return existing
    InvoiceDTO getOrCreateForBooking(UUID bookingId);
}
