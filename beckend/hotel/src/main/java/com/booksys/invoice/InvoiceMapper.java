package com.booksys.invoice;

import com.booksys.booking.Booking;
import org.springframework.stereotype.Component;

@Component
public class InvoiceMapper {

    public InvoiceDTO toDTO(Invoice invoice) {
        if (invoice == null) return null;

        InvoiceDTO dto = new InvoiceDTO();
        dto.setId(invoice.getId());
        dto.setBookingId(invoice.getBooking() != null ? invoice.getBooking().getId() : null);
        dto.setInvoiceNumber(invoice.getInvoiceNumber());
        dto.setAmount(invoice.getAmount());
        dto.setIssuedDate(invoice.getIssuedDate());
        dto.setStatus(invoice.getStatus() != null ? invoice.getStatus().name() : null);
        dto.setPdfUrl(invoice.getPdfUrl());

        return dto;
    }

    public Invoice toEntity(InvoiceDTO dto, Booking booking) {
        if (dto == null) return null;

        Invoice invoice = new Invoice();
        invoice.setId(dto.getId());
        invoice.setBooking(booking);
        invoice.setInvoiceNumber(dto.getInvoiceNumber());
        invoice.setAmount(dto.getAmount());
        invoice.setIssuedDate(dto.getIssuedDate());
        if (dto.getStatus() != null) {
            invoice.setStatus(InvoiceStatus.valueOf(dto.getStatus()));
        }
        invoice.setPdfUrl(dto.getPdfUrl());

        return invoice;
    }
}
