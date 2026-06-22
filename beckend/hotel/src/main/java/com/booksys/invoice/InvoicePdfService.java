package com.booksys.invoice;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Generates a professional PDF invoice using OpenPDF.
 * Called from InvoiceController GET /api/invoices/{id}/pdf
 */
@Service
@RequiredArgsConstructor
public class InvoicePdfService {

    private final InvoiceRepository invoiceRepository;

    private static final Color BRAND_PURPLE = new Color(79, 70, 229);
    private static final Color LIGHT_GRAY   = new Color(248, 250, 252);
    private static final Color BORDER_GRAY  = new Color(226, 232, 240);
    private static final Color TEXT_DARK    = new Color(15, 23, 42);
    private static final Color TEXT_MUTED   = new Color(100, 116, 139);

    public byte[] generatePdf(UUID invoiceId) {
        var id = java.util.Objects.requireNonNull(invoiceId, "invoiceId must not be null");
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Invoice not found: " + id));

        var booking = invoice.getBooking();
        var guest   = booking != null ? booking.getGuest()  : null;
        var room    = booking != null ? booking.getRoom()   : null;
        var hotel   = room    != null ? room.getHotel()     : null;

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 50, 50, 60, 60);
            PdfWriter.getInstance(doc, out);
            doc.open();

            // ── Header banner ──────────────────────────────────────────────
            PdfPTable header = new PdfPTable(2);
            header.setWidthPercentage(100);
            header.setWidths(new float[]{2f, 1f});

            PdfPCell brandCell = new PdfPCell();
            brandCell.setBorder(Rectangle.NO_BORDER);
            brandCell.setBackgroundColor(BRAND_PURPLE);
            brandCell.setPadding(20);
            Font brandFont = new Font(Font.HELVETICA, 22, Font.BOLD, Color.WHITE);
            Font tagFont   = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(199, 210, 254));
            brandCell.addElement(new Paragraph("LuxStay", brandFont));
            brandCell.addElement(new Paragraph("Hotel Management Platform", tagFont));
            header.addCell(brandCell);

            PdfPCell invCell = new PdfPCell();
            invCell.setBorder(Rectangle.NO_BORDER);
            invCell.setBackgroundColor(BRAND_PURPLE);
            invCell.setPadding(20);
            invCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Font invTitleFont = new Font(Font.HELVETICA, 16, Font.BOLD, Color.WHITE);
            Font invNumFont   = new Font(Font.HELVETICA, 11, Font.NORMAL, new Color(199, 210, 254));
            Paragraph invTitle = new Paragraph("INVOICE", invTitleFont);
            invTitle.setAlignment(Element.ALIGN_RIGHT);
            Paragraph invNum = new Paragraph(invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "", invNumFont);
            invNum.setAlignment(Element.ALIGN_RIGHT);
            invCell.addElement(invTitle);
            invCell.addElement(invNum);
            header.addCell(invCell);

            doc.add(header);
            doc.add(Chunk.NEWLINE);

            // ── Meta row: issued date + status ─────────────────────────────
            PdfPTable meta = new PdfPTable(2);
            meta.setWidthPercentage(100);
            Font labelFont = new Font(Font.HELVETICA, 9, Font.BOLD, TEXT_MUTED);
            Font valueFont = new Font(Font.HELVETICA, 10, Font.NORMAL, TEXT_DARK);

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");
            String issued = invoice.getIssuedDate() != null ? invoice.getIssuedDate().format(fmt) : "—";

            meta.addCell(metaCell("Issued", issued, labelFont, valueFont));
            meta.addCell(metaCell("Status", invoice.getStatus() != null ? invoice.getStatus().name() : "—", labelFont, valueFont));
            doc.add(meta);
            doc.add(Chunk.NEWLINE);

            // ── Guest + Hotel info ─────────────────────────────────────────
            PdfPTable parties = new PdfPTable(2);
            parties.setWidthPercentage(100);

            PdfPCell guestBox = sectionBox("Bill To");
            if (guest != null) {
                addLine(guestBox, guest.getFirstName() + " " + guest.getLastName(), valueFont);
                if (guest.getEmail() != null) addLine(guestBox, guest.getEmail(), new Font(Font.HELVETICA, 9, Font.NORMAL, TEXT_MUTED));
                if (guest.getPhone() != null) addLine(guestBox, guest.getPhone(), new Font(Font.HELVETICA, 9, Font.NORMAL, TEXT_MUTED));
            } else {
                addLine(guestBox, "Guest not found", valueFont);
            }
            parties.addCell(guestBox);

            PdfPCell hotelBox = sectionBox("Property");
            String hotelName = hotel != null ? hotel.getName() : "—";
            String roomNo    = room  != null && room.getRoomNumber() != null ? "Room " + room.getRoomNumber() : "—";
            addLine(hotelBox, hotelName, valueFont);
            addLine(hotelBox, roomNo, new Font(Font.HELVETICA, 9, Font.NORMAL, TEXT_MUTED));
            parties.addCell(hotelBox);

            doc.add(parties);
            doc.add(Chunk.NEWLINE);

            // ── Booking details table ──────────────────────────────────────
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2f, 1.5f, 1.5f, 1f});

            addTableHeader(table, "Description", "Check-In", "Check-Out", "Nights");

            String desc     = "Room " + (room != null && room.getRoomNumber() != null ? room.getRoomNumber() : "—");
            String checkIn  = booking != null && booking.getCheckInDate()  != null ? booking.getCheckInDate().toString()  : "—";
            String checkOut = booking != null && booking.getCheckOutDate() != null ? booking.getCheckOutDate().toString() : "—";
            long nights = 0;
            if (booking != null && booking.getCheckInDate() != null && booking.getCheckOutDate() != null) {
                nights = java.time.temporal.ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate());
            }

            addTableRow(table, desc, checkIn, checkOut, String.valueOf(nights));
            doc.add(table);
            doc.add(Chunk.NEWLINE);

            // ── Total ──────────────────────────────────────────────────────
            PdfPTable totalTable = new PdfPTable(2);
            totalTable.setWidthPercentage(40);
            totalTable.setHorizontalAlignment(Element.ALIGN_RIGHT);

            Font totalLabelFont = new Font(Font.HELVETICA, 11, Font.BOLD, TEXT_DARK);
            Font totalValueFont = new Font(Font.HELVETICA, 14, Font.BOLD, BRAND_PURPLE);

            PdfPCell totalLabel = new PdfPCell(new Phrase("TOTAL DUE", totalLabelFont));
            totalLabel.setBorder(Rectangle.TOP);
            totalLabel.setBorderColor(BORDER_GRAY);
            totalLabel.setPadding(10);
            totalTable.addCell(totalLabel);

            String amount = invoice.getAmount() != null ? "€" + invoice.getAmount().toPlainString() : "€0.00";
            PdfPCell totalValue = new PdfPCell(new Phrase(amount, totalValueFont));
            totalValue.setBorder(Rectangle.TOP);
            totalValue.setBorderColor(BORDER_GRAY);
            totalValue.setPadding(10);
            totalValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalTable.addCell(totalValue);

            doc.add(totalTable);

            // ── Footer ─────────────────────────────────────────────────────
            doc.add(Chunk.NEWLINE);
            Font footerFont = new Font(Font.HELVETICA, 8, Font.ITALIC, TEXT_MUTED);
            Paragraph footer = new Paragraph("Thank you for choosing LuxStay. This invoice was generated automatically.", footerFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            doc.add(footer);

            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    /* ── Helpers ─────────────────────────────────────────────────────────── */

    private PdfPCell metaCell(String label, String value, Font labelFont, Font valueFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(BORDER_GRAY);
        cell.setPadding(8);
        cell.addElement(new Paragraph(label, labelFont));
        cell.addElement(new Paragraph(value, valueFont));
        return cell;
    }

    private PdfPCell sectionBox(String title) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(BORDER_GRAY);
        cell.setBackgroundColor(LIGHT_GRAY);
        cell.setPadding(12);
        Font titleFont = new Font(Font.HELVETICA, 9, Font.BOLD, BRAND_PURPLE);
        cell.addElement(new Paragraph(title.toUpperCase(), titleFont));
        cell.addElement(new Paragraph(" "));
        return cell;
    }

    private void addLine(PdfPCell cell, String text, Font font) {
        cell.addElement(new Paragraph(text, font));
    }

    private void addTableHeader(PdfPTable table, String... headers) {
        Font hFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, hFont));
            cell.setBackgroundColor(BRAND_PURPLE);
            cell.setPadding(8);
            cell.setBorder(Rectangle.NO_BORDER);
            table.addCell(cell);
        }
    }

    private void addTableRow(PdfPTable table, String... values) {
        Font rFont = new Font(Font.HELVETICA, 9, Font.NORMAL, TEXT_DARK);
        for (String v : values) {
            PdfPCell cell = new PdfPCell(new Phrase(v, rFont));
            cell.setPadding(8);
            cell.setBorderColor(BORDER_GRAY);
            cell.setBorder(Rectangle.BOTTOM);
            table.addCell(cell);
        }
    }
}
