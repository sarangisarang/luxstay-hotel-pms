"use client";

import { useEffect, useState } from "react";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type MonthlyRev = { month: string; revenue: number };
type KPI = { month: string; revpar: number; adr: number; occupancyPct: number };

const fmt = (n: number) =>
    new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function StatCard({ label, value, sub, delta, color }: { label: string; value: string; sub?: string; delta?: number; color?: string }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", borderLeft: color ? `4px solid ${color}` : undefined }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
            {delta != null && (
                <div style={{ fontSize: "0.75rem", marginTop: 4, color: delta >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs last month
                </div>
            )}
        </div>
    );
}

export default function FinancialsPage() {
  const { t } = useTranslation();
    const [monthly, setMonthly] = useState<MonthlyRev[]>([]);
    const [kpi, setKpi] = useState<KPI[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get("/api/admin/monthly-revenue"),
            api.get("/api/admin/kpi"),
            api.get("/api/admin/stats"),
        ]).then(([m, k, s]) => {
            setMonthly(m.data);
            setKpi(k.data);
            setStats(s.data);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const totalYTD = monthly.slice(-12).reduce((s: number, m: MonthlyRev) => s + m.revenue, 0);
    const lastMonth = monthly[monthly.length - 1]?.revenue ?? 0;
    const prevMonth = monthly[monthly.length - 2]?.revenue ?? 0;
    const delta = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : 0;
    const lastKPI = kpi[kpi.length - 1];

    if (loading) return <div className="state-container"><div className="spinner" /></div>;

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('financialDashboard', 'Financial Dashboard')}</h1>
                    <p className="page-subtitle">{t('financialSubtitle', 'Revenue, KPI metrics and performance trends')}</p>
                </div>
                <button className="btn-secondary" onClick={load}>↻ {t('refresh', 'Refresh')}</button>
            </div>

            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
                <StatCard label="Revenue (YTD)" value={fmt(totalYTD)} color="#6366f1" />
                <StatCard label="Last Month" value={fmt(lastMonth)} delta={delta} color="#3b82f6" />
                <StatCard label="Today" value={fmt(stats?.revenueToday ?? 0)} color="#22c55e" />
                <StatCard label="ADR" value={lastKPI ? fmt(lastKPI.adr) : "—"} sub="avg daily rate" color="#f59e0b" />
                <StatCard label="RevPAR" value={lastKPI ? fmt(lastKPI.revpar) : "—"} sub={lastKPI ? `${lastKPI.occupancyPct.toFixed(1)}% occ.` : undefined} color="#ec4899" />
            </div>

            {/* Revenue trend */}
            <div className="data-card" style={{ padding: "20px", marginBottom: 20 }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>Monthly Revenue (12 months)</h2>
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={monthly} margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                        <defs>
                            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: any) => [fmt(Number(v)), "Revenue"]} />
                        <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: "#6366f1" }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* ADR + RevPAR + Occupancy */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div className="data-card" style={{ padding: "20px" }}>
                    <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>{t('adrVsRevpar', 'ADR vs RevPAR')}</h2>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={kpi} margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tickFormatter={v => `€${v}`} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: any) => [`€${Number(v).toFixed(2)}`]} />
                            <Legend />
                            <Bar dataKey="adr" name="ADR" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="revpar" name="RevPAR" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="data-card" style={{ padding: "20px" }}>
                    <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>Occupancy % (12 months)</h2>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={kpi} margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                            <defs>
                                <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Occupancy"]} />
                            <Area type="monotone" dataKey="occupancyPct" name="Occupancy" stroke="#22c55e" strokeWidth={2} fill="url(#occGrad)" dot={{ r: 3, fill: "#22c55e" }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Summary table */}
            <div className="data-card" style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                            {["Month", "Revenue", "ADR", "RevPAR", "Occupancy"].map(h => (
                                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {kpi.slice().reverse().map((row, i) => {
                            const rev = monthly.find((m: MonthlyRev) => m.month === row.month)?.revenue ?? 0;
                            return (
                                <tr key={row.month} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: "0.875rem" }}>{row.month}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>{fmt(rev)}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>{fmt(row.adr)}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>{fmt(row.revpar)}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3 }}>
                                                <div style={{ width: `${Math.min(100, row.occupancyPct)}%`, height: "100%", background: row.occupancyPct > 80 ? "#22c55e" : row.occupancyPct > 50 ? "#f59e0b" : "#ef4444", borderRadius: 3 }} />
                                            </div>
                                            <span style={{ minWidth: 40, fontSize: "0.8rem", fontWeight: 600 }}>{row.occupancyPct.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
