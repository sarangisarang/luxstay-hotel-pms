"use client";
/**
 * @file exportToPDF.ts
 * Utility for exporting a booking list to a styled PDF file using jsPDF + jspdf-autotable.
 * The generated file is immediately downloaded by the browser.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Booking } from "../tables/BookingList";

/**
 * Converts a booking array to a formatted PDF table and triggers a browser download.
 *
 * Columns (in order): Guest | Room | Check In | Check Out | Total | Payment.
 *
 * @param bookings - Array of {@link Booking} records to include in the export.
 */
export function exportToPDF(bookings: Booking[]): void {
    const doc = new jsPDF();
    doc.text("Booking List", 14, 20);

    const tableColumn = ["Guest", "Room", "Check In", "Check Out", "Total", "Payment"];

    const tableRows: string[][] = bookings.map((b) => [
        String(b.guestName ?? ""),
        String(b.roomNumber ?? ""),
        String(b.checkInDate ?? ""),
        String(b.checkOutDate ?? ""),
        `$${Number(b.totalAmount).toFixed(2)}`,
        String(b.paymentStatus ?? ""),
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: "grid",
        headStyles: { fillColor: [100, 149, 237] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        styles: { cellPadding: 3, fontSize: 10 },
    });

    doc.save("booking_list.pdf");
}