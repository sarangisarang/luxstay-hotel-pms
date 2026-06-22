"use client";

import { useEffect, useState, useMemo } from "react";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import api from "@/components/lib/axiosConfig";
import AiInsightCard from "@/components/AiInsightCard";
import s from "@/styles/PaceReport.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type PaceRow = {
    date: string;
    dateLy: string;
    roomsOnBooks: number;
    roomsOnBooksLy: number;
    variance: number;
    pickupThisWeek: number;
    occupancyPct: number;
    occupancyPctLy: number;
};

type HeatmapDay = { date: string; occupied: number; occupancyPct: number };
type PickupDay  = { arrivalDate: string; newBookings: number };

const WINDOWS = [7, 14, 30, 60, 90] as const;

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function varianceCls(v: number) {
    if (v > 0) return s.varPos;
    if (v < 0) return s.varNeg;
    return s.varFlat;
}

function heatColor(pct: number) {
    if (pct >= 90) return "#7c3aed";
    if (pct >= 75) return "#2563eb";
    if (pct >= 50) return "#0891b2";
    if (pct >= 25) return "#16a34a";
    if (pct >= 10) return "#ca8a04";
    return "#d1d5db";
}

export default function PaceReportPage() {
  const { t } = useTranslation();
    const [pace,     setPace]     = useState<PaceRow[]>([]);
    const [heatmap,  setHeatmap]  = useState<HeatmapDay[]>([]);
    const [pickup,   setPickup]   = useState<PickupDay[]>([]);
    const [window_,  setWindow]   = useState<7 | 14 | 30 | 60 | 90>(30);
    const [loading,  setLoading]  = useState(true);
    const [tab,      setTab]      = useState<"pace" | "heatmap" | "pickup">("pace");

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get("/api/admin/pace"),
            api.get("/api/admin/occupancy-heatmap"),
            api.get(`/api/admin/pickup?days=7`),
        ]).then(([pr, hr, pkr]) => {
            setPace(Array.isArray(pr.data) ? pr.data : []);
            setHeatmap(Array.isArray(hr.data) ? hr.data : []);
            setPickup(Array.isArray(pkr.data) ? pkr.data : []);
        }).finally(() => setLoading(false));
    }, []);

    const slicedPace = useMemo(() => pace.slice(0, window_), [pace, window_]);

    const chartData = useMemo(() => slicedPace.map(r => ({
        date:      fmtDate(r.date),
        "This Year":  r.roomsOnBooks,
        "Last Year":  r.roomsOnBooksLy,
        "Pickup (7d)": r.pickupThisWeek,
        variance:  r.variance,
        occPct:    r.occupancyPct,
    })), [slicedPace]);

    // Summary KPIs
    const totalOnBooks = slicedPace.reduce((a, r) => a + r.roomsOnBooks, 0);
    const totalOnBooksLy = slicedPace.reduce((a, r) => a + r.roomsOnBooksLy, 0);
    const totalPickup = slicedPace.reduce((a, r) => a + r.pickupThisWeek, 0);
    const avgOcc = slicedPace.length ? (slicedPace.reduce((a, r) => a + r.occupancyPct, 0) / slicedPace.length) : 0;
    const avgOccLy = slicedPace.length ? (slicedPace.reduce((a, r) => a + r.occupancyPctLy, 0) / slicedPace.length) : 0;
    const paceVariance = totalOnBooks - totalOnBooksLy;
    const paceVariancePct = totalOnBooksLy > 0 ? ((paceVariance / totalOnBooksLy) * 100).toFixed(1) : "N/A";

    // Heatmap grouping by month
    const heatmapByMonth = useMemo(() => {
        const months: Record<string, HeatmapDay[]> = {};
        for (const d of heatmap) {
            const m = d.date.slice(0, 7);
            if (!months[m]) months[m] = [];
            months[m].push(d);
        }
        return Object.entries(months).slice(-6);
    }, [heatmap]);

    // Pickup top 14 days
    const pickupTop = useMemo(() =>
        pickup.filter(p => p.newBookings > 0).slice(0, 14),
    [pickup]);

    if (loading) return (
        <div className={s.stateContainer}>
            <div className={s.spinner} />
            <p>{t('loadingPaceData', 'Loading PACE data…')}</p>
        </div>
    );

    return (
        <div className={`fade-in ${s.root}`}>
            <AiInsightCard endpoint="/api/ai/insights/revenue" title="AI Revenue Pace Intelligence" compact />

            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('paceReport', 'PACE Report')}</h1>
                    <p className="page-subtitle">{t('paceReportSubtitle', 'Booking velocity vs. last year · Pick-up trends · Occupancy heatmap')}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className={s.kpiRow}>
                <div className={s.kpiCard}>
                    <div className={s.kpiLabel}>Rooms on Books ({window_}d)</div>
                    <div className={s.kpiValue}>{totalOnBooks.toLocaleString()}</div>
                    <div className={`${s.kpiSub} ${varianceCls(paceVariance)}`}>
                        vs {totalOnBooksLy.toLocaleString()} LY ({paceVariance >= 0 ? "+" : ""}{paceVariancePct}%)
                    </div>
                </div>
                <div className={s.kpiCard}>
                    <div className={s.kpiLabel}>7-Day Pickup</div>
                    <div className={s.kpiValue}>{totalPickup}</div>
                    <div className={s.kpiSub}>new bookings this week</div>
                </div>
                <div className={s.kpiCard}>
                    <div className={s.kpiLabel}>Avg Occupancy ({window_}d)</div>
                    <div className={s.kpiValue}>{avgOcc.toFixed(1)}%</div>
                    <div className={`${s.kpiSub} ${varianceCls(avgOcc - avgOccLy)}`}>
                        vs {avgOccLy.toFixed(1)}% LY
                    </div>
                </div>
                <div className={s.kpiCard}>
                    <div className={s.kpiLabel}>Pace Signal</div>
                    <div className={`${s.kpiValue} ${paceVariance >= 0 ? s.paceAhead : s.paceBehind}`}>
                        {paceVariance >= 0 ? "AHEAD" : "BEHIND"}
                    </div>
                    <div className={s.kpiSub}>vs same period last year</div>
                </div>
            </div>

            {/* Tabs */}
            <div className={s.tabs}>
                {(["pace", "heatmap", "pickup"] as const).map(t => (
                    <button key={t} type="button"
                        className={`${s.tab} ${tab === t ? s.tabActive : ""}`}
                        onClick={() => setTab(t)}>
                        {t === "pace" ? "Booking Pace" : t === "heatmap" ? "Occupancy Heatmap" : "Pick-Up Report"}
                    </button>
                ))}
            </div>

            {/* PACE Chart */}
            {tab === "pace" && (
                <div className="data-card">
                    <div className="data-card-header">
                        <span className="data-card-title">Rooms on Books vs. Last Year</span>
                        <div className={s.windowButtons}>
                            {WINDOWS.map(w => (
                                <button key={w} type="button"
                                    className={`${s.windowBtn} ${window_ === w ? s.windowBtnActive : ""}`}
                                    onClick={() => setWindow(w)}>
                                    {w}d
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={s.chartWrap}>
                        <ResponsiveContainer width="100%" height={320}>
                            <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={Math.floor(chartData.length / 6)} />
                                <YAxis yAxisId="rooms" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="pickup" orientation="right" tick={{ fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border, #e5e7eb)" }}
                                    formatter={(v, name) => [
                                        name === "occPct" ? `${v}%` : v,
                                        name,
                                    ]}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <ReferenceLine yAxisId="rooms" y={0} stroke="#94a3b8" />
                                <Bar yAxisId="rooms" dataKey="This Year" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={12} />
                                <Bar yAxisId="rooms" dataKey="Last Year" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={12} />
                                <Line yAxisId="pickup" type="monotone" dataKey="Pickup (7d)"
                                    stroke="#f59e0b" strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    <div className={s.tableWrap}>
                        <table className="ui-table">
                            <thead>
                                <tr>
                                    <th>{t('date')}</th>
                                    <th>{t('onBooksTy', 'On Books (TY)')}</th>
                                    <th>{t('onBooksLy', 'On Books (LY)')}</th>
                                    <th>{t('varianceLabel', 'Variance')}</th>
                                    <th>{t('pickupWeek', 'Pickup (7d)')}</th>
                                    <th>{t('occPctTy', 'Occ % (TY)')}</th>
                                    <th>{t('occPctLy', 'Occ % (LY)')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slicedPace.map(r => (
                                    <tr key={r.date}>
                                        <td className="cell-name">{fmtDate(r.date)}</td>
                                        <td className="cell-mono">{r.roomsOnBooks}</td>
                                        <td className="cell-mono cell-muted">{r.roomsOnBooksLy}</td>
                                        <td>
                                            <span className={`${s.variancePill} ${varianceCls(r.variance)}`}>
                                                {r.variance >= 0 ? "+" : ""}{r.variance}
                                            </span>
                                        </td>
                                        <td className="cell-mono">{r.pickupThisWeek}</td>
                                        <td className="cell-mono">{r.occupancyPct}%</td>
                                        <td className="cell-mono cell-muted">{r.occupancyPctLy}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Occupancy Heatmap */}
            {tab === "heatmap" && (
                <div className="data-card">
                    <div className="data-card-header">
                        <span className="data-card-title">Occupancy Heatmap — Last 6 Months</span>
                        <div className={s.legend}>
                            {[
                                { label: "0–10%", color: "#d1d5db" },
                                { label: "10–25%", color: "#ca8a04" },
                                { label: "25–50%", color: "#16a34a" },
                                { label: "50–75%", color: "#0891b2" },
                                { label: "75–90%", color: "#2563eb" },
                                { label: "90%+", color: "#7c3aed" },
                            ].map(({ label, color }) => (
                                <span key={label} className={s.legendItem}>
                                    <span className={s.legendDot} style={{ background: color }} />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className={s.heatmapGrid}>
                        {heatmapByMonth.map(([month, days]) => (
                            <div key={month} className={s.heatmapMonth}>
                                <div className={s.heatmapMonthLabel}>
                                    {new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                </div>
                                <div className={s.heatmapDays}>
                                    {days.map(d => (
                                        <div key={d.date}
                                            className={s.heatmapCell}
                                            style={{ background: heatColor(d.occupancyPct) }}
                                            title={`${fmtDate(d.date)}: ${d.occupancyPct}% (${d.occupied} rooms)`}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pick-Up Report */}
            {tab === "pickup" && (
                <div className="data-card">
                    <div className="data-card-header">
                        <span className="data-card-title">Bookings Made in Last 7 Days by Arrival Date</span>
                    </div>
                    {pickupTop.length === 0 ? (
                        <div className={s.stateContainer}>
                            <p>{t('newBookingsLastWeek', 'No new bookings made in the last 7 days.')}</p>
                        </div>
                    ) : (
                        <>
                            <div className={s.chartWrap}>
                                <ResponsiveContainer width="100%" height={220}>
                                    <ComposedChart data={pickupTop} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" />
                                        <XAxis dataKey="arrivalDate" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip formatter={(v) => [v, "New Bookings"]} />
                                        <Bar dataKey="newBookings" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <div className={s.tableWrap}>
                                <table className="ui-table">
                                    <thead>
                                        <tr>
                                            <th>{t('arrivalDate', 'Arrival Date')}</th>
                                            <th>{t('newBookingsWeek', 'New Bookings (Last 7d)')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pickupTop.map(p => (
                                            <tr key={p.arrivalDate}>
                                                <td className="cell-name">{fmtDate(p.arrivalDate)}</td>
                                                <td className="cell-mono">{p.newBookings}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
