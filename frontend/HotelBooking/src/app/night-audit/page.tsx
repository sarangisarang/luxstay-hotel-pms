"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Audit = {
    auditDate: string;
    arrivals: number;
    departures: number;
    stayovers: number;
    noShows: number;
    roomRevenue: number;
    adr: number;
    revpar: number;
    occupancyPct: number;
    totalRooms: number;
    occupiedRooms: number;
    newBookings: number;
    cancellations: number;
};

function fmt(n: number) {
    return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
}

const KPI = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div style={{
        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
        padding: "16px 20px", borderLeft: color ? `4px solid ${color}` : undefined,
    }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
);

export default function NightAuditPage() {
  const { t } = useTranslation();
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [audit, setAudit] = useState<Audit | null>(null);
    const [loading, setLoading] = useState(false);

    const load = (d: string) => {
        setLoading(true);
        api.get(`/api/admin/night-audit?date=${d}`)
            .then(r => setAudit(r.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(date); }, []);

    const handlePrint = () => window.print();

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('nightAudit', 'Night Audit')}</h1>
                    <p className="page-subtitle">{t('nightAuditSubtitle', 'End-of-day financial and operational summary')}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <input type="date" value={date} onChange={e => { setDate(e.target.value); load(e.target.value); }}
                        style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem" }} />
                    <button className="btn-secondary" onClick={handlePrint}>🖨 {t('printBtn', 'Print')}</button>
                    <button className="btn-primary" onClick={() => load(date)}>↻ {t('runAudit', 'Run Audit')}</button>
                </div>
            </div>

            {loading && <div className="state-container"><div className="spinner" /></div>}

            {audit && !loading && (
                <>
                    <div style={{ background: "#0f172a", color: "#fff", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 4 }}>{t('auditDate', 'AUDIT DATE')}</div>
                            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                                {new Date(audit.auditDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{t('totalRoomRevenue', 'TOTAL ROOM REVENUE')}</div>
                            <div style={{ fontSize: "2rem", fontWeight: 900 }}>{fmt(audit.roomRevenue)}</div>
                        </div>
                    </div>

                    {/* Movement KPIs */}
                    <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 10, letterSpacing: ".05em" }}>{t('roomMovement', 'Room Movement')}</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
                        <KPI label="Arrivals" value={audit.arrivals} color="#22c55e" />
                        <KPI label="Departures" value={audit.departures} color="#f59e0b" />
                        <KPI label="Stayovers" value={audit.stayovers} color="#6366f1" />
                        <KPI label="No-Shows" value={audit.noShows} color="#ef4444" />
                        <KPI label="Cancellations" value={audit.cancellations} color="#ec4899" />
                    </div>

                    {/* Financial KPIs */}
                    <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 10, letterSpacing: ".05em" }}>{t('financialPerformance', 'Financial Performance')}</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
                        <KPI label="ADR" value={fmt(audit.adr)} sub="avg daily rate" color="#6366f1" />
                        <KPI label="RevPAR" value={fmt(audit.revpar)} sub="revenue per available room" color="#3b82f6" />
                        <KPI label="Occupancy" value={`${audit.occupancyPct}%`} sub={`${audit.occupiedRooms} / ${audit.totalRooms} rooms`} color="#22c55e" />
                        <KPI label="New Bookings" value={audit.newBookings} sub="created today" color="#f59e0b" />
                    </div>

                    {/* Summary table */}
                    <div className="data-card" style={{ padding: 20 }}>
                        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 16 }}>{t('dailySummaryBreakdown', 'Daily Summary Breakdown')}</h2>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                                {[
                                    ["Audit Date", new Date(audit.auditDate).toLocaleDateString("en-GB")],
                                    ["Arrivals", audit.arrivals],
                                    ["Departures", audit.departures],
                                    ["Stayovers", audit.stayovers],
                                    ["No-Shows / Pending Arrivals", audit.noShows],
                                    ["New Bookings Created", audit.newBookings],
                                    ["Cancellations", audit.cancellations],
                                    ["Total Rooms", audit.totalRooms],
                                    ["Occupied Rooms", audit.occupiedRooms],
                                    ["Occupancy %", `${audit.occupancyPct}%`],
                                    ["Room Revenue", fmt(audit.roomRevenue)],
                                    ["ADR", fmt(audit.adr)],
                                    ["RevPAR", fmt(audit.revpar)],
                                ].map(([label, value], i) => (
                                    <tr key={String(label)} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                        <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: "0.875rem", color: "#374151", width: "40%" }}>{label}</td>
                                        <td style={{ padding: "10px 14px", fontSize: "0.875rem", color: "#0f172a" }}>{String(value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
