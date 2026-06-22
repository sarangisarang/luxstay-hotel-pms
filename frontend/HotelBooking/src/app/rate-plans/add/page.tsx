"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import fp from "@/styles/FormPage.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function AddRatePlan() {
  const { t } = useTranslation();
    const router = useRouter();
    const [form, setForm] = useState({
        name: "",
        description: "",
        type: "STANDARD",
        discountPercent: "10",
        minNights: "",
        validFrom: "",
        validTo: "",
        active: true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            await api.post("/api/rate-plans", {
                name: form.name,
                description: form.description || null,
                type: form.type,
                discountPercent: parseFloat(form.discountPercent),
                minNights: form.minNights ? parseInt(form.minNights) : null,
                validFrom: form.validFrom || null,
                validTo: form.validTo || null,
                active: form.active,
            });
            router.push("/rate-plans");
        } catch {
            setError("Failed to create rate plan");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={fp.page}>
            <h1 className={fp.title}>{t('addRatePlan')}</h1>
            {error && <div className={fp.errorBanner}>{error}</div>}
            <form onSubmit={submit}>
                {[
                    { label: `${t('planName')} *`, name: "name", type: "text" },
                    { label: `${t('discountPercent')} *`, name: "discountPercent", type: "number" },
                    { label: t('minNightsOptional'), name: "minNights", type: "number" },
                    { label: t('validFrom'), name: "validFrom", type: "date" },
                    { label: t('validTo'), name: "validTo", type: "date" },
                ].map(({ label, name, type }) => (
                    <div key={name} className={fp.field}>
                        <label className={fp.fieldLabel}>{label}</label>
                        <input type={type} name={name} value={(form as Record<string,string|boolean>)[name] as string} onChange={change}
                            className={fp.fieldInput} placeholder={label} />
                    </div>
                ))}

                <div className={fp.field}>
                    <label className={fp.fieldLabel}>{t('type')}</label>
                    <select name="type" value={form.type} onChange={change} className={fp.fieldSelect} title="Rate plan type">
                        {["STANDARD","EARLY_BIRD","LAST_MINUTE","WEEKEND","LONG_STAY","CORPORATE","PROMOTIONAL"].map(o =>
                            <option key={o} value={o}>{o.replace(/_/g," ")}</option>
                        )}
                    </select>
                </div>

                <div className={fp.field}>
                    <label className={fp.fieldLabel}>{t('description')}</label>
                    <textarea name="description" value={form.description} onChange={change} rows={3}
                        className={`${fp.fieldInput} ${fp.fieldTextarea}`} />
                </div>

                <div className={fp.checkRow}>
                    <input type="checkbox" name="active" id="active" checked={form.active} onChange={change} />
                    <label htmlFor="active" className={fp.checkLabel}>{t('activeImmediately')}</label>
                </div>

                <div className={fp.actions}>
                    <button type="submit" disabled={saving} className={fp.btnPrimary}>
                        {saving ? t('savingDots') : t('createRatePlan')}
                    </button>
                    <button type="button" onClick={() => router.back()} className={fp.btnCancel}>
                        {t('cancel')}
                    </button>
                </div>
            </form>
        </div>
    );
}
