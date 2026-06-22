"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { FileText, Download, RefreshCw } from "lucide-react";
import AiInsightCard from "@/components/AiInsightCard";
import Paginator from "@/components/ui/Paginator";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface Invoice {
  id: string;
  bookingId: string;
  invoiceNumber: string | null;
  amount: number;
  issuedDate: string;
  status: string;
  pdfUrl: string | null;
}

const PAGE_SIZE = 20;

export default function InvoicesPage() {
  const { t } = useTranslation();
  const [invoices,      setInvoices]      = useState<Invoice[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [downloading,   setDownloading]   = useState<string | null>(null);
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  async function fetchInvoices(p = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/invoices?page=${p}&size=${PAGE_SIZE}`);
      const d = res.data;
      setInvoices(d?.content ?? (Array.isArray(d) ? d : []));
      setTotalPages(d?.totalPages ?? 1);
      setTotalElements(d?.totalElements ?? 0);
    } catch {
      setError(t('failedToLoadInvoices'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchInvoices(page); }, [page]);

  async function downloadPdf(invoiceId: string) {
    setDownloading(invoiceId);
    try {
      const resp = await api.get(`/api/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceId.substring(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(t('failedToDownloadPdf'));
    } finally {
      setDownloading(null);
    }
  }

  if (loading) return (
    <div className="state-container"><div className="spinner" /><p className="state-title">{t('loadingInvoices')}</p></div>
  );
  if (error) return (
    <div className="state-container"><div className="state-icon">⚠️</div><p className="state-title">{error}</p></div>
  );

  return (
    <div className="fade-in">
      <AiInsightCard endpoint="/api/ai/insights/revenue" title={t('aiRevenueInvoiceAnalysis')} compact />
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('invoices')}</h1>
          <p className="page-subtitle">{totalElements} {t('invoiceCount')}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => fetchInvoices(page)}>
          <RefreshCw size={14} /> {t('refresh')}
        </button>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{t('allInvoices')}</span>
        </div>
        {invoices.length === 0 ? (
          <div className="state-container">
            <div className="state-icon"><FileText size={40} /></div>
            <p className="state-title">{t('noInvoicesYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('invoiceNum')}</th>
                  <th>{t('bookingIdLabel')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('issuedDate')}</th>
                  <th>{t('status')}</th>
                  <th>{t('pdf')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="cell-mono">{inv.invoiceNumber ?? inv.id.substring(0, 8).toUpperCase()}</td>
                    <td className="cell-mono">{inv.bookingId?.substring(0, 8).toUpperCase() ?? "—"}</td>
                    <td>€{Number(inv.amount).toFixed(2)}</td>
                    <td className="cell-muted">{inv.issuedDate ? new Date(inv.issuedDate).toLocaleDateString() : "—"}</td>
                    <td><span className="badge">{inv.status}</span></td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={downloading === inv.id}
                        onClick={() => downloadPdf(inv.id)}
                      >
                        <Download size={13} />
                        {downloading === inv.id ? "…" : t('pdf')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginator
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          size={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
