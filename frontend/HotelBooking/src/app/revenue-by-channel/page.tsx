"use client";

import { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import api from "@/components/lib/axiosConfig";
import AiInsightCard from "@/components/AiInsightCard";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type ChannelData = {
    channel: string;
    bookings: number;
    revenue: number;
    share: number;
};

const PALETTE = [
    "#6366f1","#22c55e","#f59e0b","#3b82f6","#8b5cf6",
    "#ec4899","#14b8a6","#f97316","#ef4444","#0ea5e9",
    "#84cc16","#a855f7","#06b6d4",
];

const CHANNEL_LABELS: Record<string, string> = {
    DIRECT_WEBSITE: "Direct Website",
    DIRECT_PHONE: "Phone",
    WALK_IN: "Walk-In",
    OTA_BOOKING_COM: "Booking.com",
    OTA_EXPEDIA: "Expedia",
    OTA_AIRBNB: "Airbnb",
    OTA_OTHER: "Other OTA",
    CORPORATE: "Corporate",
    TRAVEL_AGENT: "Travel Agent",
    CHANNEL_MANAGER: "Channel Manager",
    GDS: "GDS",
    GROUP: "Group",
    LOYALTY_PROGRAM: "Loyalty",
};

function fmt(n: number) {
    return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default function RevenueByChannelPage() {
  const { t } = useTranslation();
    const [data, setData] = useState<ChannelData[]>([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        api.get("/api/admin/revenue-by-channel")
            .then(r => setData(r.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
    const totalBookings = data.reduce((s, d) => s + d.bookings, 0);

    const barData = data.map(d => ({ ...d, name: CHANNEL_LABELS[d.channel] ?? d.channel }));
    const pieData = data.map(d => ({ name: CHANNEL_LABELS[d.channel] ?? d.channel, value: d.revenue }));

    if (loading) return <div className="state-container"><div className="spinner" /></div>;

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('revenueByChannel', 'Revenue by Channel')}</h1>
                    <p className="page-subtitle">{t('revenueByChannelSubtitle', 'Booking source distribution and channel revenue contribution')}</p>
                </div>
                <button className="btn-secondary" onClick={load}>↻ {t('refresh', 'Refresh')}</button>
            </div>

            <AiInsightCard endpoint="/api/ai/insights/revenue" title="AI Channel Mix Analysis" compact />

            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                    { label: "Total Revenue", value: fmt(totalRevenue) },
                    { label: "Total Bookings", value: totalBookings.toLocaleString() },
                    { label: "Channels Active", value: data.length },
                ].map(k => (
                    <div key={k.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>{k.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                {/* Bar chart */}
                <div className="data-card" style={{ padding: "20px" }}>
                    <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>{t('revenuePerChannel', 'Revenue per Channel')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barData} layout="vertical" margin={{ left: 90, right: 20, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tickFormatter={v => `€${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={88} />
                            <Tooltip formatter={(v: any) => [fmt(Number(v)), "Revenue"]} />
                            <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                                {barData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie chart */}
                <div className="data-card" style={{ padding: "20px" }}>
                    <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>{t('revenueShare', 'Revenue Share')}</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%" cy="50%"
                                outerRadius={110}
                                label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: any) => [fmt(Number(v)), "Revenue"]} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="data-card" style={{ overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                            {["Channel", "Bookings", "Revenue", "Share", "Avg per Booking"].map(h => (
                                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={row.channel} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: "0.875rem" }}>
                                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: PALETTE[i % PALETTE.length], marginRight: 8 }} />
                                    {CHANNEL_LABELS[row.channel] ?? row.channel}
                                </td>
                                <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>{row.bookings.toLocaleString()}</td>
                                <td style={{ padding: "10px 14px", fontSize: "0.875rem", fontWeight: 600 }}>{fmt(row.revenue)}</td>
                                <td style={{ padding: "10px 14px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3 }}>
                                            <div style={{ width: `${row.share}%`, height: "100%", background: PALETTE[i % PALETTE.length], borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: "0.8rem", fontWeight: 600, minWidth: 36 }}>{row.share}%</span>
                                    </div>
                                </td>
                                <td style={{ padding: "10px 14px", fontSize: "0.875rem", color: "#64748b" }}>
                                    {row.bookings > 0 ? fmt(row.revenue / row.bookings) : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
