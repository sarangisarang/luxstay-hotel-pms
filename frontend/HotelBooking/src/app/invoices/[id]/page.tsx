"use client";
import "@/styles/invoice-print.css";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getInvoiceById,
    markInvoicePaid,
    markInvoiceUnpaid,
    markInvoiceCancelled,
    deleteInvoice,
    InvoiceDTO,
} from "@/components/lib/invoiceApi";
import { getBookingById, BookingDTO } from "@/components/lib/bookingApi";
import InvoicePrintable from "@/components/invoices/InvoicePrintable";
import { useTranslation } from "react-i18next";
import "@/app/i18n";


export default function InvoicePage() {
  const { t } = useTranslation();
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params?.id as string;

    const [invoice, setInvoice] = useState<InvoiceDTO | null>(null);
    const [booking, setBooking] = useState<BookingDTO | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const inv = await getInvoiceById(id);
                setInvoice(inv);
                const b = await getBookingById(inv.bookingId);
                setBooking(b);
            } catch (e: any) {
                setErr(e?.response?.data?.message || "Failed to load invoice.");
            }
        })();
    }, [id]);

    async function runAction(fn: () => Promise<InvoiceDTO>, cb?: () => void) {
        setBusy(true);
        try {
            const updated = await fn();
            setInvoice(updated);
            cb?.();
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Operation failed.");
        } finally {
            setBusy(false);
        }
    }

    if (err) return <div className="p-6 text-red-600">{err}</div>;
    if (!invoice || !booking) return <div className="p-6">{t('loading')}</div>;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-4">
            {/* Controls (not printed) */}
            <div className="no-print flex flex-wrap gap-3">
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white shadow hover:bg-blue-700"
                >
                    Print / Save PDF
                </button>

                {invoice.pdfUrl && (
                    <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-gray-900 text-white shadow hover:bg-black"
                    >
                        Download PDF
                    </a>
                )}

                <button
                    onClick={() => runAction(() => markInvoicePaid(invoice.id))}
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-green-600 text-white shadow hover:bg-green-700 disabled:opacity-50"
                >
                    Mark Paid
                </button>
                <button
                    onClick={() => runAction(() => markInvoiceUnpaid(invoice.id))}
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-yellow-500 text-white shadow hover:bg-yellow-600 disabled:opacity-50"
                >
                    Mark Unpaid
                </button>
                <button
                    onClick={() => runAction(() => markInvoiceCancelled(invoice.id))}
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white shadow hover:bg-red-700 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={() =>
                        runAction(
                            () => {
                                deleteInvoice(invoice.id);
                                return Promise.resolve(invoice);
                            },
                            () => router.push("/bookings")
                        )
                    }
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 shadow hover:bg-gray-300 disabled:opacity-50"
                >
                    Delete
                </button>
            </div>

            {/* Printable A4 invoice */}
            <InvoicePrintable invoice={invoice} booking={booking} vatRate={0} />
        </div>
    );
}
