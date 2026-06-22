"use client";

import { useState, useEffect } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/PricingRules.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Rule = {
    id: string;
    name: string;
    type: string;
    priority: number;
    adjustmentPercent?: number;
    adjustmentFixed?: number;
    validFrom?: string;
    validTo?: string;
    active: boolean;
    conditions?: string;
    description?: string;
};

type Simulation = { baseRate: number; adjustedRate: number; appliedRules: string[] };

const TYPE_CLS: Record<string, string> = {
    SEASONAL: s.typeSeasonal, LAST_MINUTE: s.typeLastMinute, EARLY_BIRD: s.typeEarlyBird,
    WEEKEND: s.typeWeekend, OCCUPANCY_BASED: s.typeOccupancy, LONG_STAY: s.typeLongStay,
    EVENT: s.typeEvent, CUSTOM: s.typeCustom,
};

export default function PricingRulesPage() {
  const { t } = useTranslation();
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [simForm, setSimForm] = useState({ baseRate: "100", checkIn: "", nights: "3" });
    const [simResult, setSimResult] = useState<Simulation | null>(null);
    const [simLoading, setSimLoading] = useState(false);
    const [toggling, setToggling] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        api.get("/api/pricing-rules").then(r => setRules(r.data)).catch(() => setError("Failed to load pricing rules.")).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const toggleRule = async (id: string) => {
        setToggling(id);
        try { await api.patch(`/api/pricing-rules/${id}/toggle`); load(); } catch { alert("Failed to toggle rule."); }
        finally { setToggling(null); }
    };

    const simulate = async () => {
        if (!simForm.baseRate) return;
        setSimLoading(true);
        setSimResult(null);
        try {
            const params = new URLSearchParams({ baseRate: simForm.baseRate, nights: simForm.nights, ...(simForm.checkIn ? { checkIn: simForm.checkIn } : {}) });
            const r = await api.get(`/api/pricing-rules/simulate?${params}`);
            setSimResult(r.data);
        } catch { alert("Simulation failed."); }
        finally { setSimLoading(false); }
    };

    if (loading) return <div className={s.loadState}>{t('loadingPricingRules', 'Loading pricing rules…')}</div>;
    if (error)   return <div className={s.errState}>{error}</div>;

    return (
        <div className={s.page}>
            <div className={s.header}>
                <div>
                    <h1 className={s.title}>{t('pricingRules', 'Pricing Rules Engine')}</h1>
                    <p className={s.sub}>{t('pricingRulesSub', 'Configure dynamic pricing rules and test them')}</p>
                </div>
                <a href="/pricing-rules/add" className={s.addLink}>+ Add Rule</a>
            </div>

            <div className={s.layout}>
                {/* Rules list */}
                <div>
                    {rules.length === 0 && (
                        <div className={s.emptyState}>
                            <div className={s.emptyIcon}>💲</div>
                            <div className={s.emptyTitle}>{t('noPricingRules', 'No pricing rules yet')}</div>
                            <div className={s.emptySub}>Add rules for seasonal pricing, early bird discounts, and more</div>
                        </div>
                    )}
                    <div className={s.ruleList}>
                        {rules.map(r => (
                            <div key={r.id} className={`${s.ruleCard} ${r.active ? "" : s.ruleCardInactive}`}>
                                <div className={s.ruleRow}>
                                    <div>
                                        <div className={s.ruleBadgeRow}>
                                            <span className={`${s.typeBadge} ${TYPE_CLS[r.type] ?? s.typeCustom}`}>
                                                {r.type.replace("_", " ")}
                                            </span>
                                            <span className={s.priorityBadge}>Priority {r.priority}</span>
                                            {!r.active && <span className={s.inactiveBadge}>{t('inactive')}</span>}
                                        </div>
                                        <div className={s.ruleName}>{r.name}</div>
                                        {r.description && <div className={s.ruleDesc}>{r.description}</div>}
                                        <div className={s.ruleMeta}>
                                            {r.adjustmentPercent != null && (
                                                <span className={r.adjustmentPercent >= 0 ? s.adjPositive : s.adjNegative}>
                                                    {r.adjustmentPercent >= 0 ? "+" : ""}{r.adjustmentPercent}%
                                                </span>
                                            )}
                                            {r.adjustmentFixed != null && (
                                                <span className={r.adjustmentFixed >= 0 ? s.adjPositive : s.adjNegative}>
                                                    {r.adjustmentFixed >= 0 ? "+€" : "−€"}{Math.abs(r.adjustmentFixed)}
                                                </span>
                                            )}
                                            {r.validFrom && <span>From {r.validFrom}</span>}
                                            {r.validTo   && <span>To {r.validTo}</span>}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => toggleRule(r.id)} disabled={toggling === r.id}
                                        className={`${s.btnToggle} ${r.active ? s.btnDeactivate : s.btnActivate}`}>
                                        {toggling === r.id ? "..." : r.active ? "Deactivate" : "Activate"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Simulator panel */}
                <div>
                    <div className={s.simPanel}>
                        <h3 className={s.simTitle}>🧪 Rate Simulator</h3>
                        <div className={s.simFields}>
                            <div>
                                <label className={s.simLabel}>Base Rate (€)</label>
                                <input type="number" value={simForm.baseRate} onChange={e => setSimForm(f => ({ ...f, baseRate: e.target.value }))}
                                    className={s.simInput} placeholder="Base rate" />
                            </div>
                            <div>
                                <label className={s.simLabel}>Check-in Date</label>
                                <input type="date" value={simForm.checkIn} onChange={e => setSimForm(f => ({ ...f, checkIn: e.target.value }))}
                                    className={s.simInput} />
                            </div>
                            <div>
                                <label className={s.simLabel}>{t('nights')}</label>
                                <input type="number" value={simForm.nights} onChange={e => setSimForm(f => ({ ...f, nights: e.target.value }))} min={1}
                                    className={s.simInput} placeholder="Number of nights" />
                            </div>
                            <button type="button" onClick={simulate} disabled={simLoading} className={s.btnSimulate}>
                                {simLoading ? t('calculating') : t('simulatePrice')}
                            </button>
                        </div>

                        {simResult && (
                            <div className={s.simResult}>
                                <div className={s.simRow}>
                                    <span className={s.simBaseLabel}>Base Rate</span>
                                    <span className={s.simBaseValue}>€{simResult.baseRate}</span>
                                </div>
                                <div className={s.simRowFinal}>
                                    <span className={s.simFinalLabel}>Adjusted Rate</span>
                                    <span className={simResult.adjustedRate > simResult.baseRate ? s.simFinalHigher : s.simFinalLower}>
                                        €{simResult.adjustedRate?.toFixed(2)}
                                    </span>
                                </div>
                                {simResult.appliedRules?.length > 0 && (
                                    <div>
                                        <div className={s.appliedTitle}>Applied Rules:</div>
                                        {simResult.appliedRules.map((rule, i) => (
                                            <div key={i} className={s.appliedRule}>• {rule}</div>
                                        ))}
                                    </div>
                                )}
                                {(!simResult.appliedRules || simResult.appliedRules.length === 0) && (
                                    <div className={s.noRules}>{t('noRulesApplied', 'No rules applied for these parameters')}</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
