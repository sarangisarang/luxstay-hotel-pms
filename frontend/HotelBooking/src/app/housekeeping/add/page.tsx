"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import fp from "@/styles/FormPage.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function AddHousekeepingTask() {
  const { t } = useTranslation();
    const router = useRouter();
    const [form, setForm] = useState({
        roomNumber: "",
        roomId: "",
        type: "DAILY_CLEAN",
        status: "PENDING",
        priority: "MEDIUM",
        assignedTo: "",
        notes: "",
        scheduledAt: new Date().toISOString().slice(0, 16),
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
            await api.post("/api/housekeeping", {
                ...form,
                roomNumber: Number(form.roomNumber),
                scheduledAt: new Date(form.scheduledAt).toISOString(),
            });
            router.push("/housekeeping");
        } catch {
            setError("Failed to create task");
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

    const select = (label: string, name: string, options: string[]) => (
        <div className={fp.field}>
            <label className={fp.fieldLabel}>{label}</label>
            <select name={name} value={(form as Record<string,string>)[name]} onChange={change}
                className={fp.fieldSelect} title={label}>
                {options.map(o => <option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
            </select>
        </div>
    );

    return (
        <div className={fp.page}>
            <h1 className={fp.title}>{t('newHousekeepingTask')}</h1>
            {error && <div className={fp.errorBanner}>{error}</div>}
            <form onSubmit={submit}>
                {field(t('roomNumber'), "roomNumber", "number")}
                {field(t('roomIdOptional'), "roomId")}
                {select(t('type'), "type", ["DAILY_CLEAN", "DEEP_CLEAN", "TURNDOWN", "CHECKOUT_CLEAN", "INSPECTION"])}
                {select(t('priority'), "priority", ["LOW", "MEDIUM", "HIGH", "URGENT"])}
                {select(t('status'), "status", ["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"])}
                {field(t('assignedTo'), "assignedTo")}
                {field(t('scheduledAt'), "scheduledAt", "datetime-local")}
                <div className={fp.field}>
                    <label className={fp.fieldLabel}>{t('notes')}</label>
                    <textarea name="notes" value={form.notes} onChange={change} rows={3}
                        className={`${fp.fieldInput} ${fp.fieldTextarea}`} />
                </div>
                <div className={fp.actions}>
                    <button type="submit" disabled={saving} className={fp.btnPrimary}>
                        {saving ? t('savingDots') : t('createTask')}
                    </button>
                    <button type="button" onClick={() => router.back()} className={fp.btnCancel}>
                        {t('cancel')}
                    </button>
                </div>
            </form>
        </div>
    );
}
