"use client";

import { useEffect, useState } from "react";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from "recharts";
import api from "@/components/lib/axiosConfig";
import AiInsightCard from "@/components/AiInsightCard";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type TrendDay = { date: string; bookings: number; revenue: number };

const fmt = (n: number) =>
    new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default function BookingTrendsPage() {
  const { t } = useTranslation();
    const [data, setData] = useState<TrendDay[]>([]);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);

    const load = (d: number) => {
        setLoading(true);
        api.get(`/api/admin/booking-trends?days=${d}`)
            .then(r => setData(r.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(days); }, [days]);

    const totalBookings = data.reduce((s, d) => s + d.bookings, 0);
    const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
    const peakDay = data.reduce((mx, d) => d.bookings > (mx?.bookings ?? 0) ? d : mx, data[0]);
    const avgPerDay = data.length > 0 ? (totalBookings / data.length).toFixed(1) : "0";

    const chartData = data.map(d => ({
        ...d,
        date: d.date.slice(5),
    }));

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('bookingTrends')}</h1>
                    <p className="page-subtitle">{t('bookingTrendsSubtitle')}</p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    {[7, 14, 30, 60, 90].map(d => (
                        <button key={d} onClick={() => setDays(d)}
                            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                                background: days === d ? "#0f172a" : "#fff", color: days === d ? "#fff" : "#374151", borderColor: days === d ? "#0f172a" : "#d1d5db" }}>
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            <AiInsightCard endpoint="/api/ai/insights/trends" title={t('aiBookingPatternAnalysis')} compact />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
                {[
                    { label: t('totalBookings'),      value: totalBookings.toLocaleString(), color: "#6366f1" },
                    { label: t('trendsTotalRevenue'), value: fmt(totalRevenue),               color: "#22c55e" },
                    { label: t('trendsAvgPerDay'),    value: avgPerDay,                       color: "#f59e0b" },
                    { label: t('peakDay'),            value: peakDay?.date?.slice(5) ?? "—", color: "#3b82f6" },
                ].map(k => (
                    <div key={k.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", borderLeft: `4px solid ${k.color}` }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>{k.value}</div>
                    </div>
                ))}
            </div>

            {loading ? <div className="state-container"><div className="spinner" /></div> : (
                <>
                    <div className="data-card" style={{ padding: "20px", marginBottom: 20 }}>
                        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>{t('dailyBookings')}</h2>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                                <defs>
                                    <linearGradient id="bkGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.ceil(chartData.length / 12)} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Area type="monotone" dataKey="bookings" name={t('booking')} stroke="#6366f1" strokeWidth={2} fill="url(#bkGrad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="data-card" style={{ padding: "20px" }}>
                        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>{t('dailyRevenue')}</h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.ceil(chartData.length / 12)} />
                                <YAxis tickFormatter={v => `€${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v: any) => [fmt(Number(v)), t('revenueLabel')]} />
                                <Bar dataKey="revenue" name={t('revenueLabel')} fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.8} />
                                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
}
