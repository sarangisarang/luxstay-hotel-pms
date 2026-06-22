"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import AiInsightCard from "@/components/AiInsightCard";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Suggestion = {
    date: string;
    action: string;
    priority: string;
    occupancyPct: number;
    freeRooms: number;
    bookedRooms: number;
    suggestion: string;
    suggestedAdjustmentPct?: number;
};

const PRIORITY_META: Record<string, { bg: string; text: string; border: string; label: string }> = {
    URGENT:      { bg: "#fef2f2", text: "#991b1b", border: "#fecaca", label: "URGENT" },
    HIGH:        { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa", label: "HIGH" },
    OPPORTUNITY: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0", label: "OPPORTUNITY" },
    MEDIUM:      { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe", label: "MONITOR" },
};

const ACTION_ICON: Record<string, string> = {
    DEEP_DISCOUNT:    "🔥",
    PROMOTIONAL_RATE: "📣",
    MONITOR:          "👁️",
    PRICE_UPLIFT:     "💹",
};

function OccupancyBar({ pct }: { pct: number }) {
    const color = pct < 30 ? "#ef4444" : pct < 55 ? "#f59e0b" : pct < 90 ? "#3b82f6" : "#22c55e";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
            <div style={{
                flex: 1, height: 8, borderRadius: 4, background: "#e5e7eb", overflow: "hidden"
            }}>
                <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color, minWidth: 38, textAlign: "right" }}>
                {pct.toFixed(0)}%
            </span>
        </div>
    );
}

export default function RevenueOptimizerPage() {
  const { t } = useTranslation();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("ALL");

    useEffect(() => {
        api.get("/api/admin/revenue-suggestions")
            .then(r => setSuggestions(Array.isArray(r.data) ? r.data : []))
            .finally(() => setLoading(false));
    }, []);

    const priorities = ["ALL", "URGENT", "HIGH", "OPPORTUNITY", "MEDIUM"];
    const filtered = filter === "ALL" ? suggestions : suggestions.filter(s => s.priority === filter);

    const counts = {
        URGENT:      suggestions.filter(s => s.priority === "URGENT").length,
        HIGH:        suggestions.filter(s => s.priority === "HIGH").length,
        OPPORTUNITY: suggestions.filter(s => s.priority === "OPPORTUNITY").length,
        MEDIUM:      suggestions.filter(s => s.priority === "MEDIUM").length,
    };

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">Analysing revenue opportunities…</p></div>
    );

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('revenueOptimizer', 'Revenue Optimizer')}</h1>
                    <p className="page-subtitle">{t('revenueOptimizerSubtitle', 'AI-powered pricing recommendations for the next 30 days')}</p>
                </div>
                <button type="button" className="btn-secondary" onClick={() => {
                    setLoading(true);
                    api.get("/api/admin/revenue-suggestions")
                        .then(r => setSuggestions(Array.isArray(r.data) ? r.data : []))
                        .finally(() => setLoading(false));
                }}>
                    ↻ Refresh
                </button>
            </div>

            <AiInsightCard endpoint="/api/ai/insights/revenue" title="AI Revenue Strategy Analysis" compact />

            {/* Summary KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                    { key: "URGENT",      label: "Urgent Action",  icon: "🔥", color: "#991b1b" },
                    { key: "HIGH",        label: "High Priority",   icon: "📣", color: "#9a3412" },
                    { key: "OPPORTUNITY", label: "Upsell Chances", icon: "💹", color: "#166534" },
                    { key: "MEDIUM",      label: "Monitor",        icon: "👁️", color: "#1e40af" },
                ].map(({ key, label, icon, color }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setFilter(filter === key ? "ALL" : key)}
                        style={{
                            padding: "14px 16px",
                            borderRadius: 12,
                            border: `2px solid ${filter === key ? color : "#e5e7eb"}`,
                            background: filter === key ? PRIORITY_META[key].bg : "#fff",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 120ms",
                        }}
                    >
                        <div style={{ fontSize: "1.4rem" }}>{icon}</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color }}>{counts[key as keyof typeof counts]}</div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>{label}</div>
                    </button>
                ))}
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {priorities.map(p => (
                    <button
                        key={p}
                        type="button"
                        className={filter === p ? "btn-primary" : "btn-secondary"}
                        style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                        onClick={() => setFilter(p)}
                    >
                        {p === "ALL" ? `All (${suggestions.length})` : `${PRIORITY_META[p]?.label ?? p} (${counts[p as keyof typeof counts] ?? 0})`}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="data-card" style={{ padding: 32, textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
                    <p style={{ color: "#6b7280" }}>No {filter !== "ALL" ? filter.toLowerCase() : ""} action items for the next 30 days. Occupancy looks healthy!</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filtered.map(s => {
                        const meta = PRIORITY_META[s.priority] ?? PRIORITY_META.MEDIUM;
                        return (
                            <div
                                key={s.date}
                                style={{
                                    background: meta.bg,
                                    border: `1px solid ${meta.border}`,
                                    borderRadius: 12,
                                    padding: "14px 18px",
                                    display: "flex",
                                    gap: 16,
                                    alignItems: "flex-start",
                                }}
                            >
                                {/* Icon + Date */}
                                <div style={{ minWidth: 90, textAlign: "center" }}>
                                    <div style={{ fontSize: "1.5rem" }}>{ACTION_ICON[s.action] ?? "📊"}</div>
                                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: meta.text, marginTop: 2 }}>
                                        {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                    </div>
                                    <span style={{
                                        display: "inline-block", marginTop: 4,
                                        background: meta.border, color: meta.text,
                                        borderRadius: 6, padding: "2px 7px",
                                        fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.03em",
                                    }}>
                                        {meta.label}
                                    </span>
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: "0.88rem", color: meta.text, fontWeight: 600, lineHeight: 1.5 }}>
                                        {s.suggestion}
                                    </p>
                                    <div style={{ display: "flex", gap: 16, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                                        <OccupancyBar pct={s.occupancyPct} />
                                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                            {s.bookedRooms} booked · {s.freeRooms} free
                                        </span>
                                        {s.suggestedAdjustmentPct && (
                                            <span style={{
                                                fontSize: "0.75rem", fontWeight: 700,
                                                color: s.suggestedAdjustmentPct < 0 ? "#16a34a" : "#dc2626",
                                            }}>
                                                {s.suggestedAdjustmentPct < 0
                                                    ? `↑ +${Math.abs(s.suggestedAdjustmentPct)}% rate uplift`
                                                    : `↓ −${s.suggestedAdjustmentPct}% discount`}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Quick actions */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 130 }}>
                                    {s.suggestedAdjustmentPct && s.suggestedAdjustmentPct > 0 && (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            style={{ fontSize: "0.75rem", padding: "5px 10px" }}
                                            onClick={async () => {
                                                try {
                                                    await api.post("/api/pricing-rules/quick-promo", {
                                                        name: `Auto: ${s.suggestedAdjustmentPct}% off ${s.date}`,
                                                        from: s.date,
                                                        to: s.date,
                                                        discountPct: s.suggestedAdjustmentPct,
                                                    });
                                                    alert(`✅ Promo created: ${s.suggestedAdjustmentPct}% discount for ${s.date}`);
                                                } catch { alert("Failed to create promo rule."); }
                                            }}
                                        >
                                            Apply Discount
                                        </button>
                                    )}
                                    <a
                                        href="/pricing-rules"
                                        className="btn-primary"
                                        style={{ fontSize: "0.75rem", padding: "5px 10px", textAlign: "center", textDecoration: "none" }}
                                    >
                                        Adjust Rates
                                    </a>
                                    <a
                                        href="/campaigns"
                                        className="btn-secondary"
                                        style={{ fontSize: "0.75rem", padding: "5px 10px", textAlign: "center", textDecoration: "none" }}
                                    >
                                        Send Promo
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
