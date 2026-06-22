"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type RepeatGuest = { guestName: string; stays: number; totalSpent: number };

const PALETTE = [
    "#6366f1","#22c55e","#f59e0b","#3b82f6","#8b5cf6",
    "#ec4899","#14b8a6","#f97316","#ef4444","#0ea5e9",
];

const fmt = (n: number) =>
    new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export default function RepeatGuestsPage() {
  const { t } = useTranslation();
    const [data, setData] = useState<RepeatGuest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/api/admin/repeat-guests").then(r => setData(r.data)).finally(() => setLoading(false));
    }, []);

    const totalRepeat = data.length;
    const totalStays = data.reduce((s, d) => s + d.stays, 0);
    const totalValue = data.reduce((s, d) => s + d.totalSpent, 0);
    const avgStays = totalRepeat > 0 ? (totalStays / totalRepeat).toFixed(1) : "0";

    if (loading) return <div className="state-container"><div className="spinner" /></div>;

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('repeatGuests', 'Repeat Guests')}</h1>
                    <p className="page-subtitle">{t('repeatGuestsSubtitle', 'Loyal guests ranked by number of stays and total value')}</p>
                </div>
                <button className="btn-secondary" onClick={() => { setLoading(true); api.get("/api/admin/repeat-guests").then(r => setData(r.data)).finally(() => setLoading(false)); }}>↻ {t('refresh')}</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
                {[
                    { label: t('repeatGuests', 'Repeat Guests'), value: totalRepeat, color: "#6366f1" },
                    { label: t('totalStays', 'Total Stays'), value: totalStays, color: "#22c55e" },
                    { label: t('avgStays', 'Avg Stays'), value: avgStays, color: "#f59e0b" },
                    { label: t('totalValue', 'Total Value'), value: fmt(totalValue), color: "#3b82f6" },
                ].map(k => (
                    <div key={k.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", borderLeft: `4px solid ${k.color}` }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>{String(k.value)}</div>
                    </div>
                ))}
            </div>

            {data.length > 0 && (
                <div className="data-card" style={{ padding: "20px", marginBottom: 20 }}>
                    <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>{t('topRepeatGuests', 'Top Repeat Guests by Stays')}</h2>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.slice(0, 15)} layout="vertical" margin={{ left: 140, right: 20, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis dataKey="guestName" type="category" tick={{ fontSize: 11 }} width={138} />
                            <Tooltip formatter={(v: any) => [`${v} stays`]} />
                            <Bar dataKey="stays" radius={[0, 6, 6, 0]}>
                                {data.slice(0, 15).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="data-card" style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                            {[t('rank', 'Rank'), t('guestName', 'Guest Name'), t('totalStays', 'Total Stays'), t('totalSpent'), t('avgPerStay', 'Avg per Stay')].map(h => (
                                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={row.guestName} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                <td style={{ padding: "10px 14px", fontWeight: 700, color: i < 3 ? ["#f59e0b","#94a3b8","#cd7f32"][i] : "#374151" }}>
                                    {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i + 1}`}
                                </td>
                                <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: "0.875rem" }}>{row.guestName}</td>
                                <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>{row.stays}</td>
                                <td style={{ padding: "10px 14px", fontSize: "0.875rem", fontWeight: 600 }}>{fmt(row.totalSpent)}</td>
                                <td style={{ padding: "10px 14px", fontSize: "0.875rem", color: "#64748b" }}>{fmt(row.totalSpent / row.stays)}</td>
                            </tr>
                        ))}
                        {data.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>{t('noRepeatGuests')}</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
