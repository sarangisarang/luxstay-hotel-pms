"use client";
import { InvoiceDTO } from "@/components/lib/invoiceApi";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function InvoiceCard({ invoice }: { invoice: InvoiceDTO }) {
    const { t } = useTranslation();
    return (
        <div className="rounded-2xl shadow-md p-6 bg-white">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t('invoice')}</h2>
                {invoice.invoiceNumber && (
                    <span className="text-sm px-2 py-1 rounded-full bg-gray-100">
            #{invoice.invoiceNumber}
          </span>
                )}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <p><span className="font-medium">Invoice ID:</span> {invoice.id}</p>
                <p><span className="font-medium">Booking ID:</span> {invoice.bookingId}</p>
                <p><span className="font-medium">Amount:</span> €{Number(invoice.amount).toFixed(2)}</p>
                <p><span className="font-medium">Status:</span> {invoice.status}</p>
                {invoice.issuedDate && (
                    <p><span className="font-medium">Issued:</span> {new Date(invoice.issuedDate).toLocaleString()}</p>
                )}
                {invoice.pdfUrl && (
                    <p>
                        <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            className="underline"
                            rel="noreferrer"
                        >
                            Download PDF
                        </a>
                    </p>
                )}
            </div>
        </div>
    );
}
