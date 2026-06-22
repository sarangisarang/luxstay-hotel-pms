"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import Link from "next/link";
import AiInsightCard from "@/components/AiInsightCard";
import s from "@/styles/Maintenance.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Issue = {
    id: string;
    roomNumber: number;
    title: string;
    description?: string;
    status: string;
    priority: string;
    category: string;
    reportedBy?: string;
    assignedTo?: string;
    resolutionNotes?: string;
    reportedAt: string;
    resolvedAt?: string;
};

const PRIORITY_CLS: Record<string, string> = {
    LOW: s.pilLow, MEDIUM: s.pillMedium, HIGH: s.pillHigh, CRITICAL: s.pillCritical,
};
const STATUS_CLS: Record<string, string> = {
    OPEN: s.pillOpen, IN_PROGRESS: s.pillInProgress, ON_HOLD: s.pillOnHold,
    RESOLVED: s.pillResolved, CLOSED: s.pillClosed,
};

const STATUSES = ["ALL", "OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "CLOSED"];
const STATUS_LABEL_KEY: Record<string, string> = {
    ALL: "all", OPEN: "open", IN_PROGRESS: "inProgress", ON_HOLD: "onHold",
    RESOLVED: "resolvedStatus", CLOSED: "closedStatus",
};

export default function MaintenancePage() {
  const { t } = useTranslation();
    const [issues,      setIssues]      = useState<Issue[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [filter,      setFilter]      = useState("ALL");
    const [assignInput, setAssignInput] = useState<Record<string, string>>({});

    const load = () => {
        setLoading(true);
        api.get("/api/maintenance")
            .then((r: { data: Issue[] }) => setIssues(r.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const updateStatus = async (id: string, status: string, resolutionNotes?: string) => {
        await api.patch(`/api/maintenance/${id}/status`, { status, resolutionNotes });
        load();
    };

    const assign = async (id: string) => {
        const val = assignInput[id];
        if (!val) return;
        await api.patch(`/api/maintenance/${id}/assign`, { assignedTo: val });
        load();
    };

    const deleteIssue = async (id: string) => {
        if (!confirm(t('deleteGuestConfirm'))) return;
        await api.delete(`/api/maintenance/${id}`);
        load();
    };

    const filtered = filter === "ALL" ? issues : issues.filter(i => i.status === filter);

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingMaintenance')}</p></div>
    );

    return (
        <div className="page-wrapper fade-in">
            <AiInsightCard endpoint="/api/ai/insights/operations" title={t('aiOperationsAnalysis')} compact />

            <div className={s.header}>
                <h1 className={s.title}>{t('maintenanceIssues')}</h1>
                <Link href="/maintenance/add" className={s.addBtn}>+ {t('reportIssue')}</Link>
            </div>

            <div className={s.filters}>
                {STATUSES.map(st => (
                    <button
                        type="button"
                        key={st}
                        className={`${s.filterBtn} ${filter === st ? s.filterBtnActive : ""}`}
                        onClick={() => setFilter(st)}
                    >
                        {t(STATUS_LABEL_KEY[st])}
                    </button>
                ))}
            </div>

            <div className={s.list}>
                {filtered.map(issue => (
                    <div key={issue.id} className={s.card}>
                        <div className={s.cardBody}>
                            <div className={s.cardTitleRow}>
                                <span className={s.cardTitle}>{t('room')} {issue.roomNumber} — {issue.title}</span>
                                <span className={`${s.pill} ${PRIORITY_CLS[issue.priority] ?? ""}`}>{t(`priority${issue.priority.charAt(0)}${issue.priority.slice(1).toLowerCase()}` as never, issue.priority)}</span>
                                <span className={`${s.pill} ${STATUS_CLS[issue.status] ?? ""}`}>{t(STATUS_LABEL_KEY[issue.status] ?? issue.status)}</span>
                                <span className={s.pillCategory}>{issue.category}</span>
                            </div>
                            {issue.description && <div className={s.cardDesc}>{issue.description}</div>}
                            <div className={s.cardMeta}>
                                {t('reported')}: {new Date(issue.reportedAt).toLocaleString()}
                                {issue.reportedBy && ` by ${issue.reportedBy}`}
                                {issue.assignedTo && ` · ${t('assigned')}: ${issue.assignedTo}`}
                                {issue.resolvedAt && ` · ${t('resolvedStatus')}: ${new Date(issue.resolvedAt).toLocaleString()}`}
                            </div>
                            {issue.resolutionNotes && (
                                <div className={s.resolution}>{t('resolution')}: {issue.resolutionNotes}</div>
                            )}
                        </div>

                        <div className={s.actions}>
                            {issue.status === "OPEN" && (
                                <button type="button" className={`${s.actionBtn} ${s.btnStart}`}
                                    onClick={() => updateStatus(issue.id, "IN_PROGRESS")}>
                                    {t('startWork')}
                                </button>
                            )}
                            {issue.status === "IN_PROGRESS" && (
                                <button type="button" className={`${s.actionBtn} ${s.btnResolve}`}
                                    onClick={() => {
                                        const notes = prompt(t('resolutionNotePrompt'));
                                        updateStatus(issue.id, "RESOLVED", notes ?? undefined);
                                    }}>
                                    {t('markResolved')}
                                </button>
                            )}
                            {issue.status === "RESOLVED" && (
                                <button type="button" className={`${s.actionBtn} ${s.btnClose}`}
                                    onClick={() => updateStatus(issue.id, "CLOSED")}>
                                    {t('closeIssue')}
                                </button>
                            )}
                            <div className={s.assignRow}>
                                <input
                                    placeholder={t('assignToPlaceholder')}
                                    value={assignInput[issue.id] ?? ""}
                                    onChange={e => setAssignInput(p => ({ ...p, [issue.id]: e.target.value }))}
                                    className={s.assignInput}
                                />
                                <button type="button" className={s.btnAssign} onClick={() => assign(issue.id)}>→</button>
                            </div>
                            <button type="button" className={`${s.actionBtn} ${s.btnDelete}`}
                                onClick={() => deleteIssue(issue.id)}>
                                {t('delete')}
                            </button>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && <div className={s.empty}>{t('noIssues')}</div>}
            </div>
        </div>
    );
}
