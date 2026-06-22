"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, Legend,
} from "recharts";
import s from "@/styles/ChainDashboard.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Summary = {
    totalHotels: number; totalRooms: number; occupiedRooms: number;
    occupancyPct: number; revenueToday: number; revenueMtd: number;
    revenueYtd: number; totalBookings: number; freeRooms: number; maintenanceRooms: number;
};
type HotelKpi = {
    hotelId: string; hotelName: string; city: string; country: string;
    totalRooms: number; occupiedRooms: number; occupancyPct: number;
    adr: number; revPar: number; totalRevenue: number; totalBookings: number;
};

const COLORS = ["#6366f1","#22c55e","#f59e0b","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316"];

function fmt(n: number | undefined) {
    if (n === undefined || n === null) return "—";
    return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

const ACCENT_CLS: Record<string, string> = {
    "#6366f1": s.accentIndigo, "#3b82f6": s.accentBlue,  "#22c55e": s.accentGreen,
    "#f59e0b": s.accentAmber,  "#8b5cf6": s.accentPurple, "#ec4899": s.accentPink,
    "#14b8a6": s.accentTeal,   "#94a3b8": s.accentSlate,
};

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
    return (
        <div className={`${s.kpiCard} ${ACCENT_CLS[accent ?? "#6366f1"] ?? s.accentIndigo}`}>
            <div className={s.kpiLabel}>{label}</div>
            <div className={s.kpiValue}>{value}</div>
            {sub && <div className={s.kpiSub}>{sub}</div>}
        </div>
    );
}

export default function ChainDashboardPage() {
  const { t } = useTranslation();
    const [summary, setSummary] = useState<Summary | null>(null);
    const [hotels,  setHotels]  = useState<HotelKpi[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get("/api/chain/summary"),
            api.get("/api/chain/compare"),
        ]).then(([s, h]) => {
            setSummary(s.data);
            setHotels(Array.isArray(h.data) ? h.data : []);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingChainData', 'Loading chain data…')}</p></div>
    );

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('chainDashboard', 'Chain Dashboard')}</h1>
                    <p className="page-subtitle">{t('chainSubtitle', 'Multi-property performance overview')}</p>
                </div>
            </div>

            {/* Summary KPIs */}
            {summary && (
                <div className={s.kpiGrid}>
                    <KpiCard label={t('totalHotels', 'Total Hotels')}   value={String(summary.totalHotels)}  accent="#6366f1" />
                    <KpiCard label={t('totalRooms', 'Total Rooms')}    value={String(summary.totalRooms)}   accent="#3b82f6" />
                    <KpiCard label={t('occupancyLabel')}               value={`${summary.occupancyPct}%`}
                        sub={`${summary.occupiedRooms} / ${summary.totalRooms} ${t('rooms')}`}  accent="#22c55e" />
                    <KpiCard label={t('revenueToday', 'Revenue Today')} value={fmt(summary.revenueToday)}  accent="#f59e0b" />
                    <KpiCard label={t('revenueMtd', 'Revenue MTD')}    value={fmt(summary.revenueMtd)}     accent="#8b5cf6" />
                    <KpiCard label={t('revenueYtd', 'Revenue YTD')}    value={fmt(summary.revenueYtd)}     accent="#ec4899" />
                    <KpiCard label={t('totalBookings')}                value={String(summary.totalBookings)} accent="#14b8a6" />
                    <KpiCard label={t('freeRooms', 'Free Rooms')}      value={String(summary.freeRooms)}
                        sub={`${summary.maintenanceRooms} ${t('inMaintenance', 'in maintenance')}`}         accent="#94a3b8" />
                </div>
            )}

            {/* RevPAR comparison chart */}
            {hotels.length > 0 && (
                <div className={s.chartCard}>
                    <div className={s.chartTitle}>{t('revparByHotel', 'RevPAR by Hotel')}</div>
                    <div className={s.chartSub}>{t('revparDesc', 'Revenue per Available Room — higher is better')}</div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={hotels} margin={{ top: 8, right: 20, left: 0, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="hotelName" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `€${v}`} />
                            <Tooltip formatter={(v) => [`€${Number(v ?? 0).toFixed(2)}`, "RevPAR"]} />
                            <Bar dataKey="revPar" name="RevPAR" radius={[6,6,0,0]}>
                                {hotels.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Occupancy comparison chart */}
            {hotels.length > 0 && (
                <div className={s.chartCard}>
                    <div className={s.chartTitle}>{t('occupancyByHotel', 'Occupancy % by Hotel')}</div>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={hotels} margin={{ top: 8, right: 20, left: 0, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="hotelName" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                            <Tooltip formatter={(v) => [`${Number(v ?? 0).toFixed(1)}%`, "Occupancy"]} />
                            <Bar dataKey="occupancyPct" name="Occupancy %" radius={[6,6,0,0]}>
                                {hotels.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Per-hotel table */}
            <div className="data-card">
                <div className="data-card-header">
                    <span className="data-card-title">{t('hotelBreakdown', 'Hotel-by-Hotel Breakdown')}</span>
                </div>
                <div className={s.tableScroll}>
                    <table className="ui-table">
                        <thead>
                            <tr>
                                <th>{t('hotel')}</th><th>{t('location')}</th><th>{t('rooms')}</th>
                                <th>{t('occupancyLabel')}</th><th>{t('adrLabel')}</th><th>{t('revparLabel')}</th>
                                <th>{t('totalRevenue', 'Total Revenue')}</th><th>{t('bookings')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hotels.map((h, i) => (
                                <tr key={h.hotelId}>
                                    <td>
                                        <div className="cell-with-icon">
                                            <span className={`avatar-sm ${s[`avColor${i % 8}`]}`}>
                                                {h.hotelName.charAt(0)}
                                            </span>
                                            <span className="cell-name">{h.hotelName}</span>
                                        </div>
                                    </td>
                                    <td className="cell-muted">{[h.city, h.country].filter(Boolean).join(", ")}</td>
                                    <td>{h.totalRooms}</td>
                                    <td>
                                        <div className={s.occCell}>
                                            <progress className={s.occBar} value={Math.round(h.occupancyPct)} max={100} />
                                            <span>{h.occupancyPct}%</span>
                                        </div>
                                    </td>
                                    <td className="cell-mono">{fmt(h.adr)}</td>
                                    <td className={`cell-mono ${s.revParCell}`}>{fmt(h.revPar)}</td>
                                    <td className="cell-mono">{fmt(h.totalRevenue)}</td>
                                    <td>{h.totalBookings}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
