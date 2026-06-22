package com.booksys.invoice;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final BookingRepository bookingRepository;
    private final InvoiceMapper invoiceMapper;

    public InvoiceServiceImpl(
            InvoiceRepository invoiceRepository,
            BookingRepository bookingRepository,
            InvoiceMapper invoiceMapper
    ) {
        this.invoiceRepository = invoiceRepository;
        this.bookingRepository = bookingRepository;
        this.invoiceMapper = invoiceMapper;
    }

    @Override
    public Page<InvoiceDTO> getAllInvoices(Pageable pageable) {
        return invoiceRepository.findAll(pageable).map(invoiceMapper::toDTO);
    }

    @Override
    public InvoiceDTO generateInvoice(UUID bookingId) {
        var existing = invoiceRepository.findByBookingId(bookingId);
        if (existing.isPresent()) return invoiceMapper.toDTO(existing.get());

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + bookingId));

        Invoice invoice = new Invoice();
        invoice.setBooking(booking);
        invoice.setAmount(booking.getTotalAmount());
        invoice.setStatus(InvoiceStatus.GENERATED);

        return invoiceMapper.toDTO(invoiceRepository.save(invoice));
    }

    @Override
    public InvoiceDTO getInvoiceById(UUID id) {
        return invoiceMapper.toDTO(invoiceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + id)));
    }

    @Override
    public InvoiceDTO updateInvoice(UUID id, InvoiceDTO invoiceDTO) {
        Invoice existing = invoiceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + id));

        if (invoiceDTO.getAmount() != null) existing.setAmount(invoiceDTO.getAmount());
        if (invoiceDTO.getStatus() != null) existing.setStatus(InvoiceStatus.valueOf(invoiceDTO.getStatus()));
        if (invoiceDTO.getPdfUrl() != null) existing.setPdfUrl(invoiceDTO.getPdfUrl());

        return invoiceMapper.toDTO(invoiceRepository.save(existing));
    }

    @Override
    public void deleteInvoice(UUID id) {
        if (!invoiceRepository.existsById(id)) {
            throw new EntityNotFoundException("Invoice not found: " + id);
        }
        invoiceRepository.deleteById(id);
    }

    @Override
    public InvoiceDTO getInvoiceByBookingId(UUID bookingId) {
        return invoiceRepository.findByBookingId(bookingId)
                .map(invoiceMapper::toDTO)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found for booking: " + bookingId));
    }

    @Override
    public InvoiceDTO getInvoiceByInvoiceNumber(String invoiceNumber) {
        Invoice invoice = (Invoice) invoiceRepository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + invoiceNumber));
        return invoiceMapper.toDTO(invoice);
    }

    @Override
    public InvoiceDTO markAsPaid(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + invoiceId));
        invoice.setStatus(InvoiceStatus.PAID);
        return invoiceMapper.toDTO(invoiceRepository.save(invoice));
    }

    @Override
    public InvoiceDTO markAsUnpaid(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + invoiceId));
        invoice.setStatus(InvoiceStatus.UNPAID);
        return invoiceMapper.toDTO(invoiceRepository.save(invoice));
    }

    @Override
    public InvoiceDTO markAsCancelled(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Invoice not found: " + invoiceId));
        invoice.setStatus(InvoiceStatus.CANCELLED);
        return invoiceMapper.toDTO(invoiceRepository.save(invoice));
    }

    @Override
    public InvoiceDTO getOrCreateForBooking(UUID bookingId) {
        return invoiceRepository.findByBookingId(bookingId)
                .map(invoiceMapper::toDTO)
                .orElseGet(() -> generateInvoice(bookingId));
    }
}
