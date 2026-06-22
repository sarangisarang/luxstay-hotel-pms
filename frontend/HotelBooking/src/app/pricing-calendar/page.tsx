"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/PricingCalendar.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type RateEntry = { roomTypeId: string; roomTypeName: string; baseRate: number; effectiveRate: number };
type DayData   = { date: string; dayOfWeek: string; rates: RateEntry[] };

function toInputDate(d: Date) {
    return d.toISOString().slice(0, 10);
}

function heatClass(rate: number, min: number, max: number): string {
    if (max === min) return s.heat3;
    const pct = (rate - min) / (max - min);
    if (pct < 0.125) return s.heat0;
    if (pct < 0.25)  return s.heat1;
    if (pct < 0.375) return s.heat2;
    if (pct < 0.5)   return s.heat3;
    if (pct < 0.625) return s.heat4;
    if (pct < 0.75)  return s.heat5;
    if (pct < 0.875) return s.heat6;
    return s.heat7;
}

export default function PricingCalendarPage() {
  const { t } = useTranslation();
    const today = new Date();
    const [from,    setFrom]    = useState(toInputDate(today));
    const [to,      setTo]      = useState(toInputDate(new Date(today.getTime() + 29 * 86400000)));
    const [data,    setData]    = useState<DayData[]>([]);
    const [loading, setLoading] = useState(false);

    function load() {
        if (!from || !to) return;
        setLoading(true);
        api.get(`/api/pricing-rules/calendar?from=${from}&to=${to}`)
            .then(r => setData(Array.isArray(r.data) ? r.data : []))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Collect unique room types from first day that has data
    const roomTypes: { id: string; name: string }[] = [];
    if (data.length > 0) {
        data[0].rates.forEach(r => roomTypes.push({ id: r.roomTypeId, name: r.roomTypeName }));
    }

    // Compute min/max for heat coloring
    let minRate = Infinity, maxRate = -Infinity;
    data.forEach(d => d.rates.forEach(r => {
        if (r.effectiveRate < minRate) minRate = r.effectiveRate;
        if (r.effectiveRate > maxRate) maxRate = r.effectiveRate;
    }));

    const todayStr = toInputDate(today);
    const weekends = new Set(["SAT", "SUN"]);

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('pricingCalendar', 'Pricing Calendar')}</h1>
                    <p className="page-subtitle">{t('pricingCalendarSubtitle', 'Live rate heatmap by room type and date')}</p>
                </div>
            </div>

            {/* Controls */}
            <div className={s.controls}>
                <label htmlFor="pc-from" className={s.controlLabel}>{t('from')}</label>
                <input id="pc-from" type="date" className={s.dateInput} value={from} onChange={e => setFrom(e.target.value)} />
                <label htmlFor="pc-to" className={s.controlLabel}>{t('to')}</label>
                <input id="pc-to" type="date" className={s.dateInput} value={to} onChange={e => setTo(e.target.value)} />
                <button type="button" className="btn-primary" onClick={load}>{t('refresh')}</button>

                <div className={s.legend}>
                    <span className={`${s.legendSwatch} ${s.legendSwatchLow}`} />Low
                    <span className={`${s.legendSwatch} ${s.legendSwatchMid}`} />Mid
                    <span className={`${s.legendSwatch} ${s.legendSwatchPeak}`} />Peak
                </div>
            </div>

            {loading && <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingRates', 'Loading rates…')}</p></div>}

            {!loading && data.length > 0 && (
                <div className={s.tableWrap}>
                    <table className={s.calTable}>
                        <thead>
                            <tr>
                                <th className={s.rtHeader}>Room Type</th>
                                {data.map(d => {
                                    const isWeekend = weekends.has(d.dayOfWeek);
                                    const isToday   = d.date === todayStr;
                                    return (
                                        <th key={d.date}>
                                            <div className={`${s.dayHeader} ${isWeekend ? s.weekend : ""} ${isToday ? s.today : ""}`}>
                                                <div>{d.date.slice(5)}</div>
                                                <div>{d.dayOfWeek}</div>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {roomTypes.map(rt => (
                                <tr key={rt.id}>
                                    <td>
                                        <div className={s.rtHeader} title={rt.name}>{rt.name}</div>
                                    </td>
                                    {data.map(d => {
                                        const rate = d.rates.find(r => r.roomTypeId === rt.id);
                                        if (!rate) return <td key={d.date} />;
                                        const cls = heatClass(rate.effectiveRate, minRate, maxRate);
                                        return (
                                            <td key={d.date}>
                                                <div className={`${s.rateCell} ${cls}`} title={`Base: €${rate.baseRate}`}>
                                                    €{rate.effectiveRate.toFixed(0)}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && data.length === 0 && (
                <div className="data-card">
                    <p className={s.emptyNote}>
                        No room types found. Add room types first.
                    </p>
                </div>
            )}
        </div>
    );
}
