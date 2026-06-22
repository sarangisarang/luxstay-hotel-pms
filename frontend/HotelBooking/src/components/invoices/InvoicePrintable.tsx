"use client";
import React, { useMemo } from "react";
import { InvoiceDTO } from "@/components/lib/invoiceApi";
import { BookingDTO } from "@/components/lib/bookingApi";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

/** შეცვალე შენი სასტუმროს რეალური დეტალებით */
const HOTEL = {
    name: "Hotel Booking",
    address: "Königsallee 1, 40212 Düsseldorf, Germany",
    phone: "+49 211 123456",
    email: "info@hotel-booking.example",
    taxId: "DE-123456789",
};

function toNumber(v: any): number {
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : 0;
}

function nightsBetween(checkInISO: string, checkOutISO: string): number {
    const inD = new Date(checkInISO);
    const outD = new Date(checkOutISO);
    const ms = outD.getTime() - inD.getTime();
    return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function InvoicePrintable({
                                             invoice,
                                             booking,
                                             vatRate = 0, // e.g. 0.07 for 7% VAT; set 0 to hide VAT rows
                                         }: {
    invoice: InvoiceDTO;
    booking: BookingDTO;
    vatRate?: number;
}) {
  const { t } = useTranslation();
    const nights = useMemo(
        () => nightsBetween(booking.checkInDate, booking.checkOutDate),
        [booking.checkInDate, booking.checkOutDate]
    );

    const roomPrice =
        toNumber(booking.roomPricePerNight) ||
        Math.max(
            0,
            (toNumber(booking.totalAmount) -
                (booking.services ?? []).reduce((s, x) => s + toNumber(x.price), 0)) /
            nights
        );

    const roomSubtotal = roomPrice * nights;
    const servicesSubtotal = (booking.services ?? []).reduce(
        (s, x) => s + toNumber(x.price),
        0
    );
    const subTotal = roomSubtotal + servicesSubtotal;

    // backend amount is source of truth
    const grandTotal =
        toNumber(invoice.amount) || toNumber(booking.totalAmount) || subTotal;

    const vatAmount = Math.round(subTotal * vatRate * 100) / 100;
    const totalWithVat = Math.round((subTotal + vatAmount) * 100) / 100;
    const showVat = vatRate > 0;

    return (
        <div
            id="invoice-print"
            className="mx-auto max-w-4xl bg-white shadow-lg rounded-2xl p-8 print:shadow-none print:rounded-none print:p-0"
        >
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">🧾 Invoice</h1>
                    {invoice.invoiceNumber && (
                        <p className="text-sm text-gray-500">No. {invoice.invoiceNumber}</p>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-lg font-semibold">{HOTEL.name}</div>
                    <div className="text-sm text-gray-600">{HOTEL.address}</div>
                    <div className="text-sm text-gray-600">{HOTEL.phone}</div>
                    <div className="text-sm text-gray-600">{HOTEL.email}</div>
                    {HOTEL.taxId && (
                        <div className="text-sm text-gray-600">Tax ID: {HOTEL.taxId}</div>
                    )}
                </div>
            </div>

            {/* Bill To + Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-1">
                    <div className="font-semibold">Bill To</div>
                    <div>{booking.guestName ?? "Guest"}</div>
                </div>
                <div className="space-y-1 md:text-right text-sm text-gray-700">
                    <div><span className="font-semibold">Invoice ID:</span> {invoice.id}</div>
                    <div><span className="font-semibold">Booking ID:</span> {booking.id}</div>
                    <div>
                        <span className="font-semibold">Issued:</span>{" "}
                        {invoice.issuedDate ? new Date(invoice.issuedDate).toLocaleString() : "—"}
                    </div>
                    <div>
                        <span className="font-semibold">Status:</span>{" "}
                        <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                                invoice.status === "PAID"
                                    ? "bg-green-100 text-green-800"
                                    : invoice.status === "CANCELLED"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-yellow-100 text-yellow-800"
                            }`}
                        >
              {invoice.status}
            </span>
                    </div>
                </div>
            </div>

            {/* Items table */}
            <div className="mt-8 overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-700 uppercase">
                    <tr>
                        <th className="p-3 text-left">{t('description')}</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Unit Price</th>
                        <th className="p-3 text-right">{t('amount')}</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                    <tr>
                        <td className="p-3">
                            Room {booking.roomNumber ?? "—"} —{" "}
                            {new Date(booking.checkInDate).toLocaleDateString()} to{" "}
                            {new Date(booking.checkOutDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">{nights}</td>
                        <td className="p-3 text-right">€{roomPrice.toFixed(2)}</td>
                        <td className="p-3 text-right">€{roomSubtotal.toFixed(2)}</td>
                    </tr>
                    {(booking.services ?? []).map((s) => {
                        const p = toNumber(s.price);
                        return (
                            <tr key={s.id}>
                                <td className="p-3">{s.name}</td>
                                <td className="p-3 text-right">1</td>
                                <td className="p-3 text-right">€{p.toFixed(2)}</td>
                                <td className="p-3 text-right">€{p.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="mt-6 flex flex-col items-end gap-1">
                <div className="w-full md:w-80 space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span>€{subTotal.toFixed(2)}</span>
                    </div>

                    {showVat && (
                        <>
                            <div className="flex justify-between">
                <span className="text-gray-600">
                  VAT ({Math.round(vatRate * 100)}%)
                </span>
                                <span>€{vatAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold border-t pt-1">
                                <span>Total (incl. VAT)</span>
                                <span>€{totalWithVat.toFixed(2)}</span>
                            </div>
                        </>
                    )}

                    <div className="flex justify-between font-bold text-gray-900 border-t pt-2">
                        <span>{t('grandTotal', 'Grand Total')}</span>
                        <span>€{grandTotal.toFixed(2)}</span>
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                        * Totals respect the backend invoice.amount as the source of truth.
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-10 text-xs text-gray-500">
                Thank you for staying with us. If you have questions about this invoice, contact {HOTEL.email}.
            </div>

            {/* PRINT-ONLY RULES → isolates only the invoice on paper */}
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 12mm; }
                    /* Hide everything... */
                    body * { visibility: hidden !important; }
                    /* ...except the invoice and its children */
                    #invoice-print, #invoice-print * { visibility: visible !important; }
                    /* Make invoice fill the page, remove shadows */
                    #invoice-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                    /* Avoid row breaks */
                    table, tr, td, th { break-inside: avoid; page-break-inside: avoid; }
                    /* Keep colors */
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
