"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import fp from "@/styles/FormPage.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

const TYPES = ["SEASONAL", "LAST_MINUTE", "EARLY_BIRD", "WEEKEND", "OCCUPANCY_BASED", "LONG_STAY", "EVENT", "CUSTOM"];

export default function AddPricingRulePage() {
  const { t } = useTranslation();
    const router = useRouter();
    const [form, setForm] = useState({
        name: "", type: "SEASONAL", priority: "10", description: "",
        adjustmentPercent: "", adjustmentFixed: "",
        validFrom: "", validTo: "", active: true, conditions: ""
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!form.name || !form.type) { alert("Name and type are required."); return; }
        if (!form.adjustmentPercent && !form.adjustmentFixed) { alert("Provide either % or fixed adjustment."); return; }
        setSaving(true);
        try {
            await api.post("/api/pricing-rules", {
                ...form,
                priority: parseInt(form.priority) || 10,
                adjustmentPercent: form.adjustmentPercent ? parseFloat(form.adjustmentPercent) : null,
                adjustmentFixed: form.adjustmentFixed ? parseFloat(form.adjustmentFixed) : null,
            });
            router.push("/pricing-rules");
        } catch { alert("Failed to save rule."); }
        finally { setSaving(false); }
    };

    const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className={fp.pageXl}>
            <h1 className={fp.title}>{t('addPricingRuleTitle')}</h1>
            <div className={fp.fields}>
                <div className={fp.grid2}>
                    <div>
                        <label className={fp.fieldLabelSm}>{t('ruleName')} *</label>
                        <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Summer High Season"
                            className={fp.fieldInputSm} />
                    </div>
                    <div>
                        <label className={fp.fieldLabelSm}>{t('type')} *</label>
                        <select value={form.type} onChange={e => set("type", e.target.value)}
                            className={fp.fieldSelectSm} title="Rule type">
                            {TYPES.map(ruleType => <option key={ruleType} value={ruleType}>{ruleType.replace("_", " ")}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className={fp.fieldLabelSm}>{t('description')}</label>
                    <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional description"
                        className={fp.fieldInputSm} />
                </div>
                <div className={fp.grid3}>
                    <div>
                        <label className={fp.fieldLabelSm}>{t('adjustmentPercent')}</label>
                        <input type="number" value={form.adjustmentPercent} onChange={e => set("adjustmentPercent", e.target.value)} placeholder="e.g. 25 or -10"
                            className={fp.fieldInputSm} />
                    </div>
                    <div>
                        <label className={fp.fieldLabelSm}>{t('fixedAmountEur')}</label>
                        <input type="number" value={form.adjustmentFixed} onChange={e => set("adjustmentFixed", e.target.value)} placeholder="e.g. 30 or -15"
                            className={fp.fieldInputSm} />
                    </div>
                    <div>
                        <label className={fp.fieldLabelSm}>{t('priority')}</label>
                        <input type="number" value={form.priority} onChange={e => set("priority", e.target.value)} min={1} max={100}
                            className={fp.fieldInputSm} placeholder="1-100" />
                    </div>
                </div>
                <div className={fp.grid2}>
                    <div>
                        <label className={fp.fieldLabelSm}>{t('validFrom')}</label>
                        <input type="date" value={form.validFrom} onChange={e => set("validFrom", e.target.value)}
                            className={fp.fieldInputSm} title={t('validFrom')} />
                    </div>
                    <div>
                        <label className={fp.fieldLabelSm}>{t('validTo')}</label>
                        <input type="date" value={form.validTo} onChange={e => set("validTo", e.target.value)}
                            className={fp.fieldInputSm} title={t('validTo')} />
                    </div>
                </div>
                <div>
                    <label className={fp.fieldLabelSm}>{t('conditionsJson')}</label>
                    <input value={form.conditions} onChange={e => set("conditions", e.target.value)} placeholder='{"minOccupancy": 80}'
                        className={`${fp.fieldInputSm} ${fp.fieldMono}`} />
                </div>
                <div className={fp.checkRow}>
                    <input type="checkbox" id="active" checked={form.active} onChange={e => set("active", e.target.checked)} />
                    <label htmlFor="active" className={fp.checkLabel}>{t('activateRuleImmediately')}</label>
                </div>
                <div className={fp.actionsEnd}>
                    <button type="button" onClick={() => router.push("/pricing-rules")} className={fp.btnCancelBorder}>{t('cancel')}</button>
                    <button type="button" onClick={save} disabled={saving} className={fp.btnSave}>
                        {saving ? t('savingDots') : t('saveRule')}
                    </button>
                </div>
            </div>
        </div>
    );
}
