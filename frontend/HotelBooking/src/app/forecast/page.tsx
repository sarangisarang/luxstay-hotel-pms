"use client";

import { useEffect, useState } from "react";
import {
    ComposedChart, Bar, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import api from "@/components/lib/axiosConfig";
import AiInsightCard from "@/components/AiInsightCard";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type ForecastDay = {
    date: string;
    occupied: number;
    checkIns: number;
    checkOuts: number;
};

type Stats = {
    totalRooms: number;
    occupiedRooms: number;
    freeRooms: number;
};

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "2-digit" });
}

function fmtDateLong(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "2-digit" });
}

function StatCard({ label, value, sub, color = "#6366f1" }: { label: string; value: string | number; sub?: string; color?: string }) {
    return (
        <div style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
            padding: "18px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
            borderTop: `3px solid ${color}`,
        }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{value}</div>
            {sub && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 6 }}>{sub}</div>}
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "#1e293b", borderRadius: 10, padding: "10px 16px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.25)" }}>
            <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: 6 }}>{fmtDateLong(label)}</div>
            {payload.map((p: any, i: number) => (
                <div key={i} style={{ color: p.color, fontSize: "0.82rem", marginBottom: 2 }}>
                    <span style={{ marginRight: 8 }}>{p.name}:</span>
                    <span style={{ fontWeight: 700 }}>{p.value}</span>
                </div>
            ))}
        </div>
    );
};

function OccupancyBar({ pct }: { pct: number }) {
    const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#3b82f6" : pct >= 25 ? "#f59e0b" : "#ef4444";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>{pct.toFixed(0)}%</span>
        </div>
    );
}

export default function ForecastPage() {
  const { t } = useTranslation();
    const [forecast, setForecast] = useState<ForecastDay[]>([]);
    const [stats,    setStats]    = useState<Stats | null>(null);
    const [loading,  setLoading]  = useState(true);
    const [view,     setView]     = useState<"chart" | "table">("chart");

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get("/api/admin/forecast"),
            api.get("/api/admin/stats"),
        ]).then(([f, s]) => {
            setForecast(Array.isArray(f.data) ? f.data : []);
            setStats(s.data);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('buildingForecast')}</p></div>
    );

    const totalRooms = stats?.totalRooms ?? (stats ? (stats.occupiedRooms + stats.freeRooms) : 1);
    const chartData  = forecast.map(d => ({
        ...d,
        occupancyPct: totalRooms > 0 ? Math.round((d.occupied / totalRooms) * 100) : 0,
    }));

    const peakDay     = chartData.reduce((a, b) => a.occupied > b.occupied ? a : b, chartData[0]);
    const troughDay   = chartData.reduce((a, b) => a.occupied < b.occupied ? a : b, chartData[0]);
    const avgOccupancy = chartData.length
        ? Math.round(chartData.reduce((s, d) => s + d.occupancyPct, 0) / chartData.length)
        : 0;
    const totalArrivals = chartData.reduce((s, d) => s + d.checkIns, 0);

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('forecastPageTitle')}</h1>
                    <p className="page-subtitle">{t('forecastSubtitle')}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    {(["chart", "table"] as const).map(v => (
                        <button key={v} type="button" onClick={() => setView(v)}
                            style={{
                                padding: "8px 18px", borderRadius: 8, border: "1px solid #e5e7eb",
                                background: view === v ? "#6366f1" : "#fff",
                                color: view === v ? "#fff" : "#374151",
                                fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                            }}>
                            {v === "chart" ? `📊 ${t('chartView')}` : `📋 ${t('tableView')}`}
                        </button>
                    ))}
                    <button type="button" className="btn-secondary" onClick={load}>↻ {t('refresh')}</button>
                </div>
            </div>

            <AiInsightCard endpoint="/api/ai/insights/revenue" title={t('aiRevenueForecastAnalysis')} compact />

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                <StatCard label={t('avgOccupancy30d')} value={`${avgOccupancy}%`} sub={t('projectedAverage')} color="#6366f1" />
                <StatCard label={t('totalArrivals30d')} value={totalArrivals.toLocaleString()} sub={t('expectedCheckIns')} color="#22c55e" />
                <StatCard label={t('peakDay')} value={peakDay ? fmtDate(peakDay.date) : "—"} sub={peakDay ? `${peakDay.occupied} ${t('rooms')}` : ""} color="#f59e0b" />
                <StatCard label={t('troughDay')} value={troughDay ? fmtDate(troughDay.date) : "—"} sub={troughDay ? `${troughDay.occupied} ${t('rooms')}` : ""} color="#3b82f6" />
            </div>

            {view === "chart" ? (
                <>
                    {/* Occupancy area chart */}
                    <div className="data-card" style={{ padding: "20px 24px", marginBottom: 20 }}>
                        <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{t('projectedOccupancy')}</h2>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} interval={2} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "80%", fill: "#22c55e", fontSize: 11 }} />
                                <Area type="monotone" dataKey="occupancyPct" stroke="#6366f1" strokeWidth={2.5} fill="url(#occGrad)" name="Occupancy %" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Arrivals / Departures bar chart */}
                    <div className="data-card" style={{ padding: "20px 24px", marginBottom: 20 }}>
                        <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{t('arrivalsAndDepartures')}</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} interval={2} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="checkIns"  name={t('arrivals')}    fill="#22c55e" radius={[4,4,0,0]} barSize={10} />
                                <Bar dataKey="checkOuts" name={t('departures')}  fill="#f59e0b" radius={[4,4,0,0]} barSize={10} />
                                <Line dataKey="occupied" name={t('occupiedRooms')} stroke="#6366f1" strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </>
            ) : (
                /* Table view */
                <div className="data-card" style={{ overflowX: "auto", marginBottom: 20 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc" }}>
                                {[t('date'), t('occupiedRooms'), t('occupancy'), t('arrivals'), t('departures')].map(h => (
                                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {chartData.map((d, i) => (
                                <tr key={d.date} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "10px 16px", fontWeight: 600, color: "#0f172a" }}>{fmtDateLong(d.date)}</td>
                                    <td style={{ padding: "10px 16px" }}>{d.occupied} / {totalRooms}</td>
                                    <td style={{ padding: "10px 16px", minWidth: 150 }}><OccupancyBar pct={d.occupancyPct} /></td>
                                    <td style={{ padding: "10px 16px" }}>
                                        {d.checkIns > 0 && <span style={{ color: "#16a34a", fontWeight: 700 }}>▲ {d.checkIns}</span>}
                                        {d.checkIns === 0 && <span style={{ color: "#94a3b8" }}>—</span>}
                                    </td>
                                    <td style={{ padding: "10px 16px" }}>
                                        {d.checkOuts > 0 && <span style={{ color: "#d97706", fontWeight: 700 }}>▼ {d.checkOuts}</span>}
                                        {d.checkOuts === 0 && <span style={{ color: "#94a3b8" }}>—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
