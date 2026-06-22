"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/Reconciliation.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type PaymentLine = {
    paymentId: string; bookingId: string | null;
    guestName: string; amount: number;
    method: string; status: string; time: string;
};
type Summary = {
    date: string; paidTotal: number; pendingTotal: number;
    paidCount: number; pendingCount: number;
    byMethod: Record<string, number>;
    lines: PaymentLine[];
};

const METHOD_ICON: Record<string, string> = {
    CARD: "💳", CASH: "💵", STRIPE: "💳", BANK_TRANSFER: "🏦",
    RECEPTION: "🖥️", ONLINE: "🌐",
};

function fmt(n: number) {
    return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n ?? 0);
}

export default function ReconciliationPage() {
  const { t } = useTranslation();
    const today = new Date().toISOString().slice(0, 10);
    const [date,    setDate]    = useState(today);
    const [data,    setData]    = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);

    function load(d: string) {
        setLoading(true);
        api.get(`/api/admin/reconciliation?date=${d}`)
            .then(r => setData(r.data))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(today); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('dailyReconciliation', 'Daily Reconciliation')}</h1>
                    <p className="page-subtitle">{t('reconciliationSubtitle', 'End-of-day financial summary & payment breakdown')}</p>
                </div>
            </div>

            {/* Date picker */}
            <div className={s.dateRow}>
                <label htmlFor="rec-date" className={s.dateLabel}>{t('reportDate', 'Report date')}</label>
                <input
                    id="rec-date"
                    type="date"
                    className={s.dateInput}
                    value={date}
                    max={today}
                    onChange={e => setDate(e.target.value)}
                />
                <button type="button" className="btn-primary" onClick={() => load(date)}>{t('load', 'Load')}</button>
            </div>

            {loading && <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loading')}</p></div>}

            {!loading && data && (
                <>
                    {/* KPI cards */}
                    <div className={s.kpiRow}>
                        <div className={`${s.kpiCard} ${s.kpiGreen}`}>
                            <div className={s.kpiLabel}>{t('totalCollected', 'Total Collected')}</div>
                            <div className={s.kpiValue}>{fmt(data.paidTotal)}</div>
                            <div className={s.kpiSub}>{data.paidCount} {t('payments')}</div>
                        </div>
                        <div className={`${s.kpiCard} ${s.kpiAmber}`}>
                            <div className={s.kpiLabel}>{t('pending')}</div>
                            <div className={s.kpiValue}>{fmt(data.pendingTotal)}</div>
                            <div className={s.kpiSub}>{data.pendingCount} {t('unpaid', 'unpaid')}</div>
                        </div>
                        <div className={`${s.kpiCard} ${s.kpiBlue}`}>
                            <div className={s.kpiLabel}>{t('totalTransactions', 'Total Transactions')}</div>
                            <div className={s.kpiValue}>{data.paidCount + data.pendingCount}</div>
                            <div className={s.kpiSub}>{data.date}</div>
                        </div>
                    </div>

                    {/* By payment method */}
                    {Object.keys(data.byMethod).length > 0 && (
                        <div className={`data-card ${s.mb24}`}>
                            <div className="data-card-header">
                                <span className="data-card-title">{t('byPaymentMethod', 'By Payment Method')}</span>
                            </div>
                            <div className={s.methodGrid}>
                                {Object.entries(data.byMethod).map(([method, total]) => (
                                    <div key={method} className={s.methodCard}>
                                        <span className={s.methodIcon}>{METHOD_ICON[method] ?? "💰"}</span>
                                        <div className={s.methodName}>{method}</div>
                                        <div className={s.methodTotal}>{fmt(total)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Transaction log */}
                    <div className="data-card">
                        <div className="data-card-header">
                            <span className="data-card-title">{t('transactionLog', 'Transaction Log')}</span>
                        </div>
                        <div className={s.tableScroll}>
                            <table className="ui-table">
                                <thead>
                                    <tr>
                                        <th>{t('timeLabel')}</th><th>{t('guestLabel')}</th><th>{t('bookingLabel2')}</th>
                                        <th>{t('method')}</th><th>{t('status')}</th><th>{t('amount')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.lines.map(line => (
                                        <tr key={line.paymentId}>
                                            <td className="cell-muted">
                                                {new Date(line.time).toLocaleTimeString()}
                                            </td>
                                            <td>{line.guestName ?? "—"}</td>
                                            <td className="cell-mono">
                                                {line.bookingId ? line.bookingId.substring(0, 8).toUpperCase() : "—"}
                                            </td>
                                            <td>
                                                <span className={s.methodPill}>
                                                    {METHOD_ICON[line.method] ?? "💰"} {line.method}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={line.status === "PAID" ? s.statusPaid : s.statusPending}>
                                                    {line.status}
                                                </span>
                                            </td>
                                            <td className="cell-mono">{fmt(line.amount)}</td>
                                        </tr>
                                    ))}
                                    {data.lines.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className={`cell-muted ${s.emptyCell}`}>
                                                {t('noTransactions', 'No transactions on')} {data.date}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
