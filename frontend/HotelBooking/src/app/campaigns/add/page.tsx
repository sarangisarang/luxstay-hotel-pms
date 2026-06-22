"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import fp from "@/styles/FormPage.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

const SEGMENTS = ["ALL", "VIP", "NEW", "RETURNING", "INACTIVE"];

export default function AddCampaignPage() {
  const { t } = useTranslation();
    const router = useRouter();
    const [form, setForm] = useState({
        name: "",
        subject: "",
        bodyHtml: "",
        targetSegment: "ALL",
        status: "DRAFT",
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!form.name || !form.subject || !form.bodyHtml) { alert("Name, subject and body are required."); return; }
        setSaving(true);
        try {
            await api.post("/api/crm/campaigns", form);
            router.push("/campaigns");
        } catch { alert("Failed to save campaign."); }
        finally { setSaving(false); }
    };

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className={fp.pageLg}>
            <h1 className={fp.title}>{t('newEmailCampaign')}</h1>

            <div className={fp.fields}>
                <div className={fp.field}>
                    <label className={fp.fieldLabelSm}>{t('campaignName')} *</label>
                    <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Summer Promo 2025"
                        className={fp.fieldInputSm} />
                </div>
                <div className={fp.field}>
                    <label className={fp.fieldLabelSm}>{t('emailSubject')} *</label>
                    <input value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="Subject line guests will see"
                        className={fp.fieldInputSm} />
                </div>
                <div className={fp.field}>
                    <label className={fp.fieldLabelSm}>{t('targetSegment')}</label>
                    <select value={form.targetSegment} onChange={e => set("targetSegment", e.target.value)}
                        className={fp.fieldSelectSm} title="Target segment">
                        {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className={fp.field}>
                    <label className={fp.fieldLabelSm}>{t('emailBody')} *</label>
                    <textarea value={form.bodyHtml} onChange={e => set("bodyHtml", e.target.value)}
                        placeholder="<p>Dear {{guestName}},</p><p>We have an exclusive offer for you...</p>"
                        className={`${fp.fieldInputSm} ${fp.fieldTextareaLg} ${fp.fieldMono}`} />
                    <div className={fp.fieldHint}>You can use HTML tags. Use {"{{guestName}}"} as a personalization placeholder.</div>
                </div>
                <div className={fp.actionsEnd}>
                    <button type="button" onClick={() => router.push("/campaigns")} className={fp.btnCancelBorder}>{t('cancel')}</button>
                    <button type="button" onClick={save} disabled={saving} className={fp.btnSave}>
                        {saving ? t('savingDots') : t('saveCampaign')}
                    </button>
                </div>
            </div>
        </div>
    );
}
