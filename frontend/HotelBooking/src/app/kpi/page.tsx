"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import AiInsightCard from "@/components/AiInsightCard";
import s from "@/styles/KPI.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type KpiMonth = {
    month: string;
    revenue: number;
    revpar: number;
    adr: number;
    occupancyPct: number;
    occupiedNights: number;
    availableNights: number;
};

type ForecastDay = {
    date: string;
    occupied: number;
    checkIns: number;
    checkOuts: number;
};

function MiniBar({ value, max, colorCls }: { value: number; max: number; colorCls: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <progress
            className={`${s.miniBar} ${colorCls}`}
            value={Math.round(pct)}
            max={100}
        />
    );
}

const SUMMARY_CARDS = [
    { key: "revenue",      labelKey: "revenueThisMonth", fmt: (v: number) => `€${Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`, cls: s.summaryValueGreen,  barCls: s.miniBarBlue   },
    { key: "revpar",       labelKey: "revPAR",           fmt: (v: number) => `€${Number(v).toFixed(2)}`,                                             cls: s.summaryValueBlue,   barCls: s.miniBarBlue   },
    { key: "adr",          labelKey: "adrLabel",         fmt: (v: number) => `€${Number(v).toFixed(2)}`,                                             cls: s.summaryValueAmber,  barCls: s.miniBarAmber  },
    { key: "occupancyPct", labelKey: "occupancyRate",    fmt: (v: number) => `${Number(v).toFixed(1)}%`,                                             cls: s.summaryValuePurple, barCls: s.miniBarPurple },
];

export default function KpiPage() {
  const { t } = useTranslation();
    const [kpi,      setKpi]      = useState<KpiMonth[]>([]);
    const [forecast, setForecast] = useState<ForecastDay[]>([]);
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
        Promise.all([api.get("/api/admin/kpi"), api.get("/api/admin/forecast")])
            .then(([k, f]) => { setKpi(k.data); setForecast(f.data); })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingKpi')}</p></div>
    );

    const latest     = kpi[kpi.length - 1];
    const maxRevPar  = Math.max(...kpi.map(k => Number(k.revpar)), 1);
    const maxAdr     = Math.max(...kpi.map(k => Number(k.adr)), 1);

    return (
        <div className="page-wrapper fade-in">
            <h1 className={s.title}>{t('kpiTitle')}</h1>
            <AiInsightCard endpoint="/api/ai/insights/revenue" title={t('aiRevenueKpiAnalysis')} />

            {/* Latest month summary */}
            {latest && (
                <div className={s.summaryGrid}>
                    {SUMMARY_CARDS.map(c => (
                        <div key={c.key} className={s.summaryCard}>
                            <div className={`${s.summaryValue} ${c.cls}`}>
                                {c.fmt(latest[c.key as keyof KpiMonth] as number)}
                            </div>
                            <div className={s.summaryLabel}>{t(c.labelKey)}</div>
                            <div className={s.summaryPeriod}>{latest.month}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* 12-month KPI table */}
            <div className={s.section}>
                <div className={s.sectionHeader}>{t('monthPerf12')}</div>
                <div className={s.tableScroll}>
                    <table className="ui-table">
                        <thead>
                            <tr>
                                <th>{t('month')}</th>
                                <th>{t('revenue')}</th>
                                <th>{t('revPAR')}</th>
                                <th>{t('revparTrend')}</th>
                                <th>{t('ADR')}</th>
                                <th>{t('adrTrend')}</th>
                                <th>{t('occupancy')}</th>
                                <th>{t('occTrend')}</th>
                                <th>{t('occNights')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {kpi.map((row, i) => {
                                const isLatest = i === kpi.length - 1;
                                const occ = Number(row.occupancyPct);
                                const occCls = occ > 70 ? s.occHigh : occ > 40 ? s.occMid : s.occLow;
                                return (
                                    <tr key={row.month} className={isLatest ? s.latestRow : ""}>
                                        <td className={isLatest ? s.monthLatest : ""}>{row.month}</td>
                                        <td className={`cell-mono ${s.summaryValueGreen}`}>
                                            €{Number(row.revenue).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="cell-mono">€{Number(row.revpar).toFixed(2)}</td>
                                        <td className={s.trendCol}>
                                            <MiniBar value={Number(row.revpar)} max={maxRevPar} colorCls={s.miniBarBlue} />
                                        </td>
                                        <td className="cell-mono">€{Number(row.adr).toFixed(2)}</td>
                                        <td className={s.trendCol}>
                                            <MiniBar value={Number(row.adr)} max={maxAdr} colorCls={s.miniBarAmber} />
                                        </td>
                                        <td className={occCls}>{occ.toFixed(1)}%</td>
                                        <td className={s.trendCol}>
                                            <MiniBar value={occ} max={100} colorCls={s.miniBarPurple} />
                                        </td>
                                        <td className="cell-muted">
                                            {row.occupiedNights} / {row.availableNights}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 30-day forecast */}
            <div className={s.section}>
                <div className={s.sectionHeader}>{t('bookingForecast30')}</div>
                <div className={s.tableScroll}>
                    <table className="ui-table">
                        <thead>
                            <tr>
                                <th>{t('date')}</th>
                                <th>{t('occupiedRooms')}</th>
                                <th>{t('checkIns')}</th>
                                <th>{t('checkOuts')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {forecast.map((day, i) => {
                                const isToday = i === 0;
                                return (
                                    <tr key={day.date} className={isToday ? s.todayRow : ""}>
                                        <td className={isToday ? s.todayLabel : ""}>
                                            {isToday ? `${t('todayLabel')} · ` : ""}
                                            {new Date(day.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                                        </td>
                                        <td>
                                            <span className={`${s.occChip} ${day.occupied > 0 ? s.occChipFilled : s.occChipEmpty}`}>
                                                {day.occupied}
                                            </span>
                                        </td>
                                        <td>
                                            {day.checkIns > 0
                                                ? <span className={s.checkIn}>↓ {day.checkIns}</span>
                                                : <span className={s.dash}>—</span>}
                                        </td>
                                        <td>
                                            {day.checkOuts > 0
                                                ? <span className={s.checkOut}>↑ {day.checkOuts}</span>
                                                : <span className={s.dash}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
