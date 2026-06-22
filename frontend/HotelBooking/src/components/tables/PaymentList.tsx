"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { Search, CreditCard, DollarSign, Download } from "lucide-react";
import AiInsightCard from "@/components/AiInsightCard";
import Paginator from "@/components/ui/Paginator";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

type Payment = {
  id: string;
  bookingId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  status: string;
};

type BookingLite = {
  id: string;
  code?: string;
  guestId?: string;
  guestName?: string;
};

type Guest = { id: string; firstName: string; lastName: string };

const STATUS_CLASS: Record<string, string> = {
  PAID:      "badge-success",
  PENDING:   "badge-warn",
  FAILED:    "badge-danger",
  CANCELLED: "badge-danger",
};

function fmtAmount(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function prettyMethod(m: string) {
  if (!m) return "—";
  if (m.toUpperCase() === "BANK_TRANSFER") return "Bank Transfer";
  return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
}

const PAGE_SIZE = 20;

export default function PaymentList() {
  const { t } = useTranslation();
  const [payments,      setPayments]      = useState<Payment[]>([]);
  const [bookingMap,    setBookingMap]    = useState<Record<string, BookingLite>>({});
  const [guestMap,      setGuestMap]      = useState<Record<string, Guest>>({});
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await api.get(`/api/payments?page=${page}&size=${PAGE_SIZE}`);
        const d = res.data;
        const list: Payment[] = d?.content ?? (Array.isArray(d) ? d : []);
        if (!alive) return;
        setPayments(list);
        setTotalPages(d?.totalPages ?? 1);
        setTotalElements(d?.totalElements ?? 0);

        const bookingIds = Array.from(new Set(list.map(p => p.bookingId).filter(Boolean)));
        const details = await Promise.all(
          bookingIds.map(id => api.get(`/api/bookings/${id}`).then(r => r.data as BookingLite).catch(() => null))
        );
        if (!alive) return;
        const bMap: Record<string, BookingLite> = {};
        for (const b of details) if (b && b.id) bMap[b.id] = b;
        setBookingMap(bMap);

        const needGuests = Object.values(bMap).filter(b => !b.guestName && b.guestId).map(b => b.guestId!);
        if (needGuests.length > 0) {
          const guestDetails = await Promise.all(
            needGuests.map(gId => api.get(`/api/guests/${gId}`).then(r => r.data as Guest).catch(() => null))
          );
          if (!alive) return;
          const gMap: Record<string, Guest> = {};
          for (const g of guestDetails) if (g && g.id) gMap[g.id] = g;
          setGuestMap(gMap);
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        if (alive) setError(err?.response?.data?.message ?? err?.message ?? "Failed to load payments.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [page]);

  function resolveGuest(bookingId: string) {
    const b = bookingMap[bookingId];
    if (!b) return { name: "—", href: undefined };
    if (b.guestName) return { name: b.guestName, href: b.guestId ? `/guests/${b.guestId}` : undefined };
    if (b.guestId && guestMap[b.guestId]) {
      const g = guestMap[b.guestId];
      return { name: `${g.firstName} ${g.lastName}`, href: `/guests/${g.id}` };
    }
    return { name: "—", href: undefined };
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(p => {
      const g = resolveGuest(p.bookingId);
      return [p.id, p.status, p.paymentMethod, g.name].some(v => (v ?? "").toLowerCase().includes(q));
    });
  }, [payments, bookingMap, guestMap, search]);

  if (loading) return (
    <div className="state-container">
      <div className="spinner" />
      <p className="state-title">{t('loadingPayments')}</p>
    </div>
  );

  if (error) return (
    <div className="state-container">
      <div className="state-icon">⚠️</div>
      <p className="state-title">{t('error', 'Error')}</p>
      <p className="state-sub">{error}</p>
    </div>
  );

  const total = payments.reduce((s, p) => s + (Number.isFinite(p.amount) ? p.amount : 0), 0);

  return (
    <div className="fade-in">
      <AiInsightCard endpoint="/api/ai/insights/revenue" title={t('aiRevenuePaymentAnalysis')} compact />
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('payments')}</h1>
          <p className="page-subtitle">{totalElements} {t('transactions')} · {fmtAmount(total)} {t('total')}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-secondary"
            onClick={() => exportCsv(`payments-${new Date().toISOString().slice(0,10)}.csv`,
              filtered.map(p => ({ id: p.id, bookingId: p.bookingId, amount: p.amount, method: p.paymentMethod || "", status: p.status, date: p.paymentDate || "" })))}>
            <Download size={14} /> {t('exportCsv')}
          </button>
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{t('allTransactions')}</span>
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder={t('searchPayments')}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="state-container">
            <div className="state-icon"><DollarSign size={28} /></div>
            <p className="state-title">{search ? t('noPaymentsMatch') : t('noPaymentsYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('booking')}</th>
                  <th>{t('guest')}</th>
                  <th>{t('amount')}</th>
                  <th>{t('method')}</th>
                  <th>{t('date')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const guest = resolveGuest(p.bookingId);
                  const b = bookingMap[p.bookingId];
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/bookings/${p.bookingId}`} className="cell-link">
                          {b?.code ?? p.bookingId.slice(0, 8)}
                        </Link>
                      </td>
                      <td>
                        {guest.href ? (
                          <Link href={guest.href} className="cell-link">{guest.name}</Link>
                        ) : (
                          <span className="cell-muted">{guest.name}</span>
                        )}
                      </td>
                      <td className="cell-mono">{fmtAmount(p.amount)}</td>
                      <td>
                        <div className="cell-with-icon">
                          <CreditCard size={13} className="icon-muted" />
                          {prettyMethod(p.paymentMethod)}
                        </div>
                      </td>
                      <td className="cell-muted">{fmtDate(p.paymentDate)}</td>
                      <td>
                        <span className={`badge ${STATUS_CLASS[p.status?.toUpperCase()] ?? "badge-neutral"}`}>
                          {p.status || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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
