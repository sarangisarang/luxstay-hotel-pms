"use client";
/**
 * @file exportToExcel.ts
 * Utility for exporting a booking list to an {@code .xlsx} file using SheetJS.
 * The file is immediately downloaded by the browser via {@code XLSX.writeFile}.
 */
import * as XLSX from "xlsx";

/** Minimum booking fields required to populate the Excel export. */
interface BookingRow {
    guestName: string;
    roomNumber: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: number;
    paymentStatus: string;
}

/**
 * Converts a booking array to a formatted Excel workbook and triggers a browser download.
 *
 * Columns: Guest | Room | Check In | Check Out | Total | Payment.
 *
 * @param bookings - Array of booking records to export.
 */
export function exportToExcel(bookings: BookingRow[]): void {
    const worksheet = XLSX.utils.json_to_sheet(
        bookings.map((b) => ({
            Guest: b.guestName,
            Room: b.roomNumber,
            "Check In": b.checkInDate,
            "Check Out": b.checkOutDate,
            Total: `$${b.totalAmount.toFixed(2)}`,
            Payment: b.paymentStatus,
        }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");
    XLSX.writeFile(workbook, "bookings.xlsx");
}