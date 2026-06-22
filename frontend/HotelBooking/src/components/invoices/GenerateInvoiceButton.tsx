"use client";
import { useState } from "react";
import { createInvoice, ensureInvoice, InvoiceDTO } from "@/components/lib/invoiceApi";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function GenerateInvoiceButton({
                                                  bookingId,
                                                  ensure = true, // if true uses /ensure; else uses /POST bookingId
                                                  label = "Generate Invoice",
                                              }: {
    bookingId: string;
    ensure?: boolean;
    label?: string;
}) {
  const { t } = useTranslation();
    const [busy, setBusy] = useState(false);
    const router = useRouter();

    async function onClick() {
        setBusy(true);
        try {
            let invoice: InvoiceDTO;
            if (ensure) invoice = await ensureInvoice(bookingId);
            else invoice = await createInvoice(bookingId);
            router.push(`/invoices/${invoice.id}`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <button
            onClick={onClick}
            disabled={busy}
            className="px-3 py-2 rounded-xl shadow bg-blue-600 text-white disabled:opacity-60"
        >
            {busy ? "Working..." : label}
        </button>
    );
}
