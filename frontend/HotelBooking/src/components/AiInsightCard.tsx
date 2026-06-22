"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface Props {
    endpoint: string;          // e.g. "/api/ai/insights/dashboard"
    title: string;             // e.g. "AI Morning Briefing"
    params?: Record<string, string>;
    autoLoad?: boolean;
    compact?: boolean;
}

export default function AiInsightCard({ endpoint, title, params, autoLoad = true, compact = false }: Props) {
    const { t } = useTranslation();
    const [insight, setInsight] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded]   = useState(false);
    const [open, setOpen]       = useState(autoLoad);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(endpoint, { params });
            setInsight(res.data.insight ?? t('noInsightAvailable'));
            setLoaded(true);
            setOpen(true);
        } catch {
            setInsight(t('couldNotLoadInsight'));
            setLoaded(true);
        } finally {
            setLoading(false);
        }
    }, [endpoint, params]);

    useEffect(() => {
        if (autoLoad) load();
    }, [autoLoad, load]);

    return (
        <div style={{
            background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
            border: "1px solid #c7d2fe",
            borderRadius: 12,
            marginBottom: compact ? 12 : 20,
            overflow: "hidden",
        }}>
            {/* Header */}
            <div
                style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: compact ? "10px 14px" : "13px 18px",
                    cursor: "pointer",
                    background: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)",
                }}
                onClick={() => { if (!open && !loaded) load(); setOpen(o => !o); }}
            >
                <span style={{ fontSize: 18 }}>🤖</span>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: compact ? 13 : 14, flex: 1 }}>
                    {title}
                </span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{t('aiInsight')}</span>
                <span style={{ color: "#fff", fontSize: 14, marginLeft: 6 }}>
                    {open ? "▲" : "▼"}
                </span>
            </div>

            {/* Body */}
            {open && (
                <div style={{ padding: compact ? "10px 14px" : "14px 18px" }}>
                    {loading && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6366f1", fontSize: 13 }}>
                            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                            {t('analysingLiveData')}
                        </div>
                    )}
                    {!loading && insight && (
                        <div style={{
                            fontSize: 13, lineHeight: 1.7, color: "#1e293b",
                            whiteSpace: "pre-wrap",
                        }}>
                            {insight}
                        </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button
                            type="button"
                            onClick={() => { setLoaded(false); load(); }}
                            disabled={loading}
                            style={{
                                padding: "5px 14px", fontSize: 12, borderRadius: 8,
                                background: "#6366f1", color: "#fff", border: "none",
                                cursor: loading ? "default" : "pointer",
                                opacity: loading ? 0.6 : 1,
                            }}
                        >
                            ↻ {t('refresh')}
                        </button>
                        <span style={{ fontSize: 11, color: "#94a3b8", alignSelf: "center" }}>
                            {t('poweredByLiveData')}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
