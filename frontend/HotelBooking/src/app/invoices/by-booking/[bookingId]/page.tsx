"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoiceByBookingId, ensureInvoice, InvoiceDTO } from "@/components/lib/invoiceApi";
import InvoiceCard from "@/components/invoices/InvoiceCard";
import InvoiceActions from "@/components/invoices/InvoiceActions";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function InvoiceByBookingPage() {
  const { t } = useTranslation();
    const { bookingId } = useParams<{ bookingId: string }>();
    const router = useRouter();
    const [invoice, setInvoice] = useState<InvoiceDTO | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                // Try fetch; if none, auto-create to keep UX smooth (comment if you want pure read-only)
                let data: InvoiceDTO;
                try {
                    data = await getInvoiceByBookingId(bookingId);
                } catch {
                    data = await ensureInvoice(bookingId);
                }
                setInvoice(data);
            } catch (e: any) {
                setErr(e?.response?.data?.message || "Failed to load invoice.");
            }
        })();
    }, [bookingId]);

    if (err) return <div className="p-6 text-red-600">{err}</div>;
    if (!invoice) return <div className="p-6">{t('loading')}</div>;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8">
            <InvoiceCard invoice={invoice} />
            <InvoiceActions
                invoice={invoice}
                onChange={setInvoice}
                onDeleted={() => router.push("/")}
            />
        </div>
    );
}
