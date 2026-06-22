package com.booksys.invoice;
import com.booksys.user.OwnershipService;
import lombok.RequiredArgsConstructor;
import com.booksys.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final InvoicePdfService invoicePdfService;
    private final OwnershipService ownershipService;

    @GetMapping
    public PageResponse<InvoiceDTO> getAllInvoices(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        size = Math.min(size, 200);
        return PageResponse.of(invoiceService.getAllInvoices(
                PageRequest.of(page, size, Sort.by("id").descending())));
    }

    // ✅ Generate invoice for a booking
    @PostMapping("/{bookingId}")
    public InvoiceDTO generateInvoice(@PathVariable UUID bookingId) {
        return invoiceService.generateInvoice(bookingId);
    }

    // ✅ Download PDF for an invoice
    @GetMapping(value = "/{id}/pdf", produces = "application/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable UUID id, Authentication auth) {
        ownershipService.requireInvoiceAccess(id, auth);
        byte[] pdf = invoicePdfService.generatePdf(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"invoice-" + id + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ✅ Get invoice by invoiceId
    @GetMapping("/{id}")
    public InvoiceDTO getInvoiceById(@PathVariable UUID id, Authentication auth) {
        ownershipService.requireInvoiceAccess(id, auth);
        return invoiceService.getInvoiceById(id);
    }

    // ✅ Get invoice by bookingId
    @GetMapping("/booking/{bookingId}")
    public InvoiceDTO getInvoiceByBooking(@PathVariable UUID bookingId, Authentication auth) {
        ownershipService.requireInvoiceAccessByBooking(bookingId, auth);
        return invoiceService.getInvoiceByBookingId(bookingId);
    }

    // ✅ Get invoice by invoiceNumber
    @GetMapping("/number/{invoiceNumber}")
    public InvoiceDTO getInvoiceByInvoiceNumber(@PathVariable String invoiceNumber) {
        return invoiceService.getInvoiceByInvoiceNumber(invoiceNumber);
    }

    // ✅ Update invoice (e.g., amount, status, pdfUrl)
    @PutMapping("/{id}")
    public InvoiceDTO updateInvoice(@PathVariable UUID id, @RequestBody InvoiceDTO dto) {
        return invoiceService.updateInvoice(id, dto);
    }

    // ✅ Delete invoice
    @DeleteMapping("/{id}")
    public void deleteInvoice(@PathVariable UUID id) {
        invoiceService.deleteInvoice(id);
    }

    // ✅ Mark invoice as PAID
    @PutMapping("/{id}/paid")
    public InvoiceDTO markAsPaid(@PathVariable UUID id) {
        return invoiceService.markAsPaid(id);
    }

    // ✅ Mark invoice as UNPAID
    @PutMapping("/{id}/unpaid")
    public InvoiceDTO markAsUnpaid(@PathVariable UUID id) {
        return invoiceService.markAsUnpaid(id);
    }

    // ✅ Mark invoice as CANCELLED
    @PutMapping("/{id}/cancelled")
    public InvoiceDTO markAsCancelled(@PathVariable UUID id) {
        return invoiceService.markAsCancelled(id);
    }
}