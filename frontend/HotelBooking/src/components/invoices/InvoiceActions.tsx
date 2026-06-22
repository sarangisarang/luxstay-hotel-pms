"use client";
import { useState } from "react";
import {
    markInvoicePaid,
    markInvoiceUnpaid,
    markInvoiceCancelled,
    deleteInvoice,
    InvoiceDTO,
} from "@/components/lib/invoiceApi";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function InvoiceActions({
                                           invoice,
                                           onChange,
                                           onDeleted,
                                       }: {
    invoice: InvoiceDTO;
    onChange: (inv: InvoiceDTO) => void;
    onDeleted?: () => void;
}) {
  const { t } = useTranslation();
    const [busy, setBusy] = useState(false);

    async function run<T>(fn: () => Promise<T>) {
        try {
            setBusy(true);
            // @ts-ignore
            const res = await fn();
            return res;
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="mt-4 flex flex-wrap gap-2">
            <button
                onClick={async () => {
                    const updated = await run(() => markInvoicePaid(invoice.id));
                    onChange(updated);
                }}
                className="px-3 py-2 rounded-xl shadow bg-green-600 text-white disabled:opacity-60"
                disabled={busy}
            >
                Mark Paid
            </button>

            <button
                onClick={async () => {
                    const updated = await run(() => markInvoiceUnpaid(invoice.id));
                    onChange(updated);
                }}
                className="px-3 py-2 rounded-xl shadow bg-yellow-500 text-white disabled:opacity-60"
                disabled={busy}
            >
                Mark Unpaid
            </button>

            <button
                onClick={async () => {
                    const updated = await run(() => markInvoiceCancelled(invoice.id));
                    onChange(updated);
                }}
                className="px-3 py-2 rounded-xl shadow bg-red-600 text-white disabled:opacity-60"
                disabled={busy}
            >
                Cancel
            </button>

            <button
                onClick={async () => {
                    await run(() => deleteInvoice(invoice.id));
                    onDeleted?.();
                }}
                className="px-3 py-2 rounded-xl shadow bg-gray-200 text-gray-800 disabled:opacity-60"
                disabled={busy}
            >
                Delete
            </button>

            <button
                onClick={async () => {
                    setBusy(true);
                    try {
                        const res = await api.get(`/api/invoices/${invoice.id}/pdf`, { responseType: "blob" });
                        const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
                        const a   = document.createElement("a");
                        a.href     = url;
                        a.download = `invoice-${invoice.invoiceNumber ?? invoice.id}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                    } finally {
                        setBusy(false);
                    }
                }}
                className="px-3 py-2 rounded-xl shadow bg-indigo-600 text-white disabled:opacity-60"
                disabled={busy}
            >
                ↓ Download PDF
            </button>
        </div>
    );
}
