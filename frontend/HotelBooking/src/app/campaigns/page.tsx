"use client";

import { useState, useEffect } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/Campaigns.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Campaign = {
    id: string;
    name: string;
    subject: string;
    bodyHtml: string;
    targetSegment: string;
    status: string;
    scheduledAt?: string;
    sentAt?: string;
    recipientCount: number;
    openCount: number;
};

const STATUS_CLS: Record<string, string> = {
    DRAFT: s.statusDraft, SCHEDULED: s.statusScheduled,
    SENT: s.statusSent,   CANCELLED: s.statusCancelled,
};

export default function CampaignsPage() {
  const { t } = useTranslation();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [sending,   setSending]   = useState<string | null>(null);
    const [preview,   setPreview]   = useState<Campaign | null>(null);

    const load = () => {
        setLoading(true);
        api.get("/api/crm/campaigns")
            .then(r => setCampaigns(r.data))
            .catch(() => setCampaigns([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const sendCampaign = async (id: string, name: string) => {
        if (!confirm(`Send campaign "${name}" to all targeted guests?`)) return;
        setSending(id);
        try {
            const r = await api.post(`/api/crm/campaigns/${id}/send`);
            alert(`Campaign sent to ${r.data.recipientCount ?? "?"} recipients!`);
            load();
        } catch { alert("Failed to send campaign. Please try again."); }
        finally { setSending(null); }
    };

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingCampaigns')}</p></div>
    );

    const totalRecipients = campaigns.reduce((acc, c) => acc + (c.recipientCount || 0), 0);

    return (
        <div className="page-wrapper fade-in">
            <div className={s.header}>
                <div className={s.titleBlock}>
                    <h1 className={s.title}>{t('emailCampaignsTitle')}</h1>
                    <p className={s.subtitle}>{t('campaignsSubtitle')}</p>
                </div>
                <a href="/campaigns/add" className={s.newBtn}>+ {t('newCampaignBtn')}</a>
            </div>

            {/* Stats */}
            {campaigns.length > 0 && (
                <div className={s.statsGrid}>
                    {[
                        { label: t('totalCampaigns'),  value: campaigns.length },
                        { label: t('sent'),             value: campaigns.filter(c => c.status === "SENT").length },
                        { label: t('drafts'),           value: campaigns.filter(c => c.status === "DRAFT").length },
                        { label: t('totalRecipients'), value: totalRecipients },
                    ].map(st => (
                        <div key={st.label} className={s.statCard}>
                            <div className={s.statValue}>{st.value}</div>
                            <div className={s.statLabel}>{st.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {campaigns.length === 0 && (
                <div className={s.emptyState}>
                    <div className={s.emptyIcon}>📧</div>
                    <div className={s.emptyTitle}>{t('noCampaignsYet')}</div>
                    <div className={s.emptyText}>{t('createFirstCampaign')}</div>
                    <a href="/campaigns/add" className={s.emptyLink}>+ {t('createCampaign')}</a>
                </div>
            )}

            {/* Campaign list */}
            <div className={s.list}>
                {campaigns.map(c => {
                    const openRate = c.recipientCount > 0 ? Math.round((c.openCount / c.recipientCount) * 100) : 0;
                    return (
                        <div key={c.id} className={s.card}>
                            <div className={s.cardBody}>
                                <div className={s.cardTitleRow}>
                                    <span className={s.cardName}>{c.name}</span>
                                    <span className={`${s.statusPill} ${STATUS_CLS[c.status] ?? s.statusDraft}`}>{c.status}</span>
                                    {c.targetSegment && (
                                        <span className={s.segmentPill}>{c.targetSegment}</span>
                                    )}
                                </div>
                                <div className={s.cardSubject}>
                                    {t('emailSubject')}: <strong>{c.subject}</strong>
                                </div>
                                <div className={s.cardMeta}>
                                    <span className={s.metaItem}>📬 {c.recipientCount} {t('totalRecipients').toLowerCase()}</span>
                                    {c.status === "SENT" && (
                                        <span className={s.metaItem}>👀 {openRate}% open rate</span>
                                    )}
                                    {c.sentAt && (
                                        <span className={s.metaDate}>{t('sent')} {new Date(c.sentAt).toLocaleDateString()}</span>
                                    )}
                                    {c.scheduledAt && c.status === "SCHEDULED" && (
                                        <span className={s.metaDate}>Scheduled {new Date(c.scheduledAt).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                            <div className={s.cardActions}>
                                <button type="button" className={s.previewBtn} onClick={() => setPreview(c)}>
                                    {t('preview')}
                                </button>
                                {(c.status === "DRAFT" || c.status === "SCHEDULED") && (
                                    <button
                                        type="button"
                                        className={s.sendBtn}
                                        onClick={() => sendCampaign(c.id, c.name)}
                                        disabled={sending === c.id}
                                    >
                                        {sending === c.id ? t('sending') : t('sendNow')}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Preview modal */}
            {preview && (
                <div className={s.overlay}>
                    <div className={s.modal}>
                        <div className={s.modalHeader}>
                            <h3 className={s.modalTitle}>{t('campaignPreview')}: {preview.name}</h3>
                            <button type="button" className={s.closeBtn} onClick={() => setPreview(null)}>×</button>
                        </div>
                        <div className={s.modalSubject}>Subject: <strong>{preview.subject}</strong></div>
                        <div
                            className={s.previewBody}
                            dangerouslySetInnerHTML={{ __html: preview.bodyHtml || "<em>No content</em>" }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
