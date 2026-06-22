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

type Analytics = {
    totalBookings: number;
    avgLengthOfStay: number;
    avgLeadTimeDays: number;
    losDist: Record<string, number>;
    bookingWindowDist: Record<string, number>;
    roomTypeDist: Record<string, number>;
    countryDist: Record<string, number>;
};

const PALETTE = [
    "#6366f1","#22c55e","#f59e0b","#3b82f6","#8b5cf6",
    "#ec4899","#14b8a6","#f97316","#ef4444","#0ea5e9",
];

const LOS_ORDER = ["1","2","3","4-5","6-7","8+"];
const WINDOW_ORDER = ["Same day","1-3 days","4-7 days","8-14 days","15-30 days","31-60 days","60+ days"];

function toBar(dist: Record<string, number>, order?: string[]) {
    const entries = Object.entries(dist);
    if (order) {
        entries.sort((a, b) => {
            const ai = order.indexOf(a[0]);
            const bi = order.indexOf(b[0]);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
    } else {
        entries.sort((a, b) => b[1] - a[1]);
    }
    return entries.map(([name, value]) => ({ name, value }));
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
            padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: 12, marginTop: 24 }}>
            {children}
        </h2>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: "0.8rem" }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
            <div style={{ color: "#6366f1" }}>{payload[0].value} bookings</div>
        </div>
    );
};

export default function GuestAnalyticsPage() {
  const { t } = useTranslation();
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/api/admin/guest-analytics")
            .then(r => setData(r.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('analysingGuestData', 'Analysing guest data…')}</p></div>
    );
    if (!data) return (
        <div className="state-container"><p className="state-title">{t('noDataAvailable', 'No data available')}</p></div>
    );

    const losBars     = toBar(data.losDist, LOS_ORDER);
    const windowBars  = toBar(data.bookingWindowDist, WINDOW_ORDER);
    const roomBars    = toBar(data.roomTypeDist);
    const countryBars = toBar(data.countryDist).slice(0, 15);

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('guestAnalytics', 'Guest Analytics')}</h1>
                    <p className="page-subtitle">{t('guestAnalyticsSubtitle', 'Length-of-stay, booking patterns, room mix and geographic breakdown')}</p>
                </div>
                <button type="button" className="btn-secondary" onClick={() => {
                    setLoading(true);
                    api.get("/api/admin/guest-analytics").then(r => setData(r.data)).finally(() => setLoading(false));
                }}>↻ {t('refresh', 'Refresh')}</button>
            </div>

            <AiInsightCard endpoint="/api/ai/insights/guests" title="AI Guest Segment Analysis" compact />

            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 8 }}>
                <StatCard label="Total bookings" value={data.totalBookings.toLocaleString()} />
                <StatCard label="Avg length of stay" value={`${data.avgLengthOfStay} nights`} sub="across all bookings" />
                <StatCard label="Avg booking lead time" value={`${data.avgLeadTimeDays} days`} sub="days before check-in" />
            </div>

            {/* Length of stay */}
            <SectionTitle>{t('losDistribution', 'Length of Stay Distribution')}</SectionTitle>
            <div className="data-card" style={{ padding: "16px 20px", marginBottom: 20 }}>
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={losBars} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} label={{ value: "Nights", position: "insideBottom", offset: -2, fontSize: 11, fill: "#94a3b8" }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {losBars.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Booking window */}
            <SectionTitle>Booking Window (Lead Time)</SectionTitle>
            <div className="data-card" style={{ padding: "16px 20px", marginBottom: 20 }}>
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={windowBars} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]}>
                            {windowBars.map((_, i) => <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Room type + country side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                    <SectionTitle>{t('roomTypeMix', 'Room Type Mix')}</SectionTitle>
                    <div className="data-card" style={{ padding: "16px 20px" }}>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={roomBars}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%" cy="50%"
                                    outerRadius={90}
                                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {roomBars.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v) => [`${v} bookings`]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div>
                    <SectionTitle>{t('topGuestCountries', 'Top Guest Countries')}</SectionTitle>
                    <div className="data-card" style={{ padding: "16px 20px" }}>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={countryBars} layout="vertical" margin={{ top: 4, right: 16, left: 60, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={58} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                    {countryBars.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
