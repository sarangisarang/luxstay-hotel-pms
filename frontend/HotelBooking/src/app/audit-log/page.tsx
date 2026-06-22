"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import Paginator from "@/components/ui/Paginator";
import s from "@/styles/AuditLog.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type ChangeLog = {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string | null;
    performedByRole: string | null;
    summary: string | null;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
};

const ACTION_CLASS: Record<string, string> = {
    CREATE: "actionCreate", UPDATE: "actionUpdate",
    DELETE: "actionDelete", STATUS_CHANGE: "actionStatus",
};
const ENTITY_TYPES = ["", "Booking", "Payment", "Room", "Guest", "Invoice"];

const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const { t } = useTranslation();
    const [logs,          setLogs]          = useState<ChangeLog[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [filter,        setFilter]        = useState("");
    const [expanded,      setExpanded]      = useState<string | null>(null);
    const [page,          setPage]          = useState(0);
    const [totalPages,    setTotalPages]    = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
        if (filter) params.set("entityType", filter);
        api.get(`/api/audit-log?${params}`)
            .then(r => {
                const d = r.data;
                setLogs(d?.content ?? (Array.isArray(d) ? d : []));
                setTotalPages(d?.totalPages ?? 1);
                setTotalElements(d?.totalElements ?? 0);
            })
            .finally(() => setLoading(false));
    }, [filter, page]);

    function reload(type: string) {
        setPage(0);
        setFilter(type);
    }

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingAuditLog', 'Loading audit log…')}</p></div>
    );

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('changeAuditLog', 'Change Audit Log')}</h1>
                    <p className="page-subtitle">{t('auditLogSubtitle', 'Full history of all data changes for compliance')}</p>
                </div>
            </div>

            {/* Filter tabs */}
            <div className={s.tabs}>
                {ENTITY_TYPES.map(entityType => (
                    <button
                        type="button"
                        key={entityType}
                        className={`${s.tab} ${filter === entityType ? s.tabActive : ""}`}
                        onClick={() => reload(entityType)}
                    >
                        {entityType || t('all')}
                    </button>
                ))}
            </div>

            <div className="data-card">
                <div className="data-card-header">
                    <span className="data-card-title">{totalElements} {t('entries', 'entries')}</span>
                </div>
                <div className={s.tableScroll}>
                    <table className="ui-table">
                        <thead>
                            <tr>
                                <th>{t('timeLabel')}</th><th>{t('entityLabel')}</th><th>{t('idLabel')}</th>
                                <th>{t('actionLabel')}</th><th>{t('byLabel2')}</th><th>{t('summaryLabel2')}</th><th>{t('diffLabel')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <>
                                    <tr key={log.id}>
                                        <td className={`cell-muted ${s.noWrap}`}>
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td><span className={s.entityPill}>{log.entityType}</span></td>
                                        <td className={`cell-mono ${s.idCell}`}>
                                            {log.entityId.substring(0, 8)}…
                                        </td>
                                        <td>
                                            <span className={`${s.actionBadge} ${s[ACTION_CLASS[log.action] ?? "actionUpdate"]}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="cell-muted">{log.performedBy ?? "—"}</td>
                                        <td className={s.summaryCell}>{log.summary ?? "—"}</td>
                                        <td>
                                            {(log.oldValue || log.newValue) && (
                                                <button
                                                    type="button"
                                                    className={s.diffBtn}
                                                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                                                >
                                                    {expanded === log.id ? t('close') : t('diffLabel')}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expanded === log.id && (
                                        <tr key={`${log.id}-diff`} className={s.diffRow}>
                                            <td colSpan={7}>
                                                <div className={s.diffGrid}>
                                                    <div className={s.diffOld}>
                                                        <div className={s.diffLabel}>{t('before', 'Before')}</div>
                                                        <pre className={s.diffPre}>{log.oldValue ?? "(none)"}</pre>
                                                    </div>
                                                    <div className={s.diffNew}>
                                                        <div className={s.diffLabel}>{t('after', 'After')}</div>
                                                        <pre className={s.diffPre}>{log.newValue ?? "(none)"}</pre>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className={`cell-muted ${s.emptyCell}`}>
                                        {t('noChangesRecorded', 'No changes recorded yet.')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Paginator
                    page={page}
                    totalPages={totalPages}
                    totalElements={totalElements}
                    size={PAGE_SIZE}
                    onPageChange={setPage}
                />
            </div>
        </div>
    );
}
