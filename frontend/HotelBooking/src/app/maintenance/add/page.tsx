"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import fp from "@/styles/FormPage.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

const CAT_KEY: Record<string, string> = {
    PLUMBING: "catPlumbing", ELECTRICAL: "catElectrical", HVAC: "catHvac",
    FURNITURE: "catFurniture", APPLIANCE: "catAppliance", STRUCTURAL: "catStructural",
    CLEANING: "catCleaning", OTHER: "catOther",
};
const PRIORITY_KEY: Record<string, string> = {
    LOW: "priorityLow", MEDIUM: "priorityMedium", HIGH: "priorityHigh", CRITICAL: "priorityCritical",
};

export default function AddMaintenanceIssue() {
  const { t } = useTranslation();
    const router = useRouter();
    const [form, setForm] = useState({
        roomNumber: "",
        roomId: "",
        title: "",
        description: "",
        category: "OTHER",
        priority: "MEDIUM",
        reportedBy: "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            await api.post("/api/maintenance", {
                ...form,
                roomNumber: Number(form.roomNumber),
                reportedAt: new Date().toISOString(),
            });
            router.push("/maintenance");
        } catch {
            setError("Failed to create maintenance issue");
        } finally {
            setSaving(false);
        }
    };

    const field = (label: string, name: string, type: string = "text") => (
        <div className={fp.field}>
            <label className={fp.fieldLabel}>{label}</label>
            <input type={type} name={name} value={(form as Record<string,string>)[name]} onChange={change}
                className={fp.fieldInput} placeholder={label} title={label} />
        </div>
    );

    return (
        <div className={fp.page}>
            <h1 className={fp.title}>{t('reportMaintenanceIssue')}</h1>
            {error && <div className={fp.errorBanner}>{error}</div>}
            <form onSubmit={submit}>
                {field(t('roomNumberRequired'), "roomNumber", "number")}
                {field(t('roomIdOptional3'), "roomId")}
                {field(t('title'), "title")}
                <div className={fp.field}>
                    <label className={fp.fieldLabel}>{t('description')}</label>
                    <textarea name="description" value={form.description} onChange={change} rows={3}
                        title={t('description')} placeholder={t('description')}
                        className={`${fp.fieldInput} ${fp.fieldTextarea}`} />
                </div>
                <div className={fp.field}>
                    <label className={fp.fieldLabel}>{t('categoryLabel')}</label>
                    <select name="category" value={form.category} onChange={change}
                        className={fp.fieldSelect} title={t('categoryLabel')}>
                        {Object.keys(CAT_KEY).map(o => (
                            <option key={o} value={o}>{t(CAT_KEY[o])}</option>
                        ))}
                    </select>
                </div>
                <div className={fp.field}>
                    <label className={fp.fieldLabel}>{t('priority')}</label>
                    <select name="priority" value={form.priority} onChange={change}
                        className={fp.fieldSelect} title={t('priority')}>
                        {Object.keys(PRIORITY_KEY).map(o => (
                            <option key={o} value={o}>{t(PRIORITY_KEY[o])}</option>
                        ))}
                    </select>
                </div>
                {field(t('reportedBy'), "reportedBy")}
                <div className={fp.actions}>
                    <button type="submit" disabled={saving} className={fp.btnDanger}>
                        {saving ? t('savingDots') : t('reportIssueBtn')}
                    </button>
                    <button type="button" onClick={() => router.back()} className={fp.btnCancel}>
                        {t('cancel')}
                    </button>
                </div>
            </form>
        </div>
    );
}
