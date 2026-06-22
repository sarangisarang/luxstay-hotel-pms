"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import Link from "next/link";
import AiInsightCard from "@/components/AiInsightCard";
import s from "@/styles/Housekeeping.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Task = {
    id: string;
    roomNumber: number;
    status: string;
    type: string;
    priority: string;
    assignedTo?: string;
    notes?: string;
    scheduledAt: string;
    completedAt?: string;
};

const STATUS_COLS = ["PENDING", "IN_PROGRESS", "DONE", "SKIPPED"];

const COL_HDR_CLS: Record<string, string> = {
    PENDING:     s.colPending,
    IN_PROGRESS: s.colInProgress,
    DONE:        s.colDone,
    SKIPPED:     s.colSkipped,
};

const PRI_CLS: Record<string, string> = {
    LOW:    s.priLow,
    MEDIUM: s.priMedium,
    HIGH:   s.priHigh,
    URGENT: s.priUrgent,
};

const COL_LABEL_KEY: Record<string, string> = {
    PENDING: "pending", IN_PROGRESS: "inProgress", DONE: "doneTask", SKIPPED: "skipped",
};

const PRI_LABEL_KEY: Record<string, string> = {
    LOW: "priorityLow", MEDIUM: "priorityMedium", HIGH: "priorityHigh", URGENT: "priorityUrgent",
};

export default function HousekeepingPage() {
  const { t } = useTranslation();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = () => {
        setLoading(true);
        api.get("/api/housekeeping")
            .then((r: { data: Task[] }) => setTasks(r.data))
            .catch(() => setError("Failed to load housekeeping tasks"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const updateStatus = async (id: string, status: string) => {
        await api.patch(`/api/housekeeping/${id}/status`, { status });
        load();
    };

    const deleteTask = async (id: string) => {
        if (!confirm(t('deleteRoomConfirm'))) return;
        await api.delete(`/api/housekeeping/${id}`);
        load();
    };

    const byStatus = (col: string) => tasks.filter(task => task.status === col);

    if (loading) return <div className={s.loadMsg}>{t('loading')}</div>;
    if (error)   return <div className={s.errMsg}>{error}</div>;

    return (
        <div className={s.page}>
            <AiInsightCard endpoint="/api/ai/insights/operations" title={t('aiOperationsBriefing')} compact />
            <div className={s.header}>
                <h1 className={s.title}>{t('housekeepingBoard')}</h1>
                <Link href="/housekeeping/add" className={s.addLink}>+ {t('newTask')}</Link>
            </div>

            <div className={s.board}>
                {STATUS_COLS.map(col => (
                    <div key={col} className={s.column}>
                        <div className={`${s.colHeader} ${COL_HDR_CLS[col]}`}>
                            {t(COL_LABEL_KEY[col])} ({byStatus(col).length})
                        </div>
                        <div className={s.colCards}>
                            {byStatus(col).map(task => (
                                <div key={task.id} className={s.taskCard}>
                                    <div className={s.taskHead}>
                                        <span className={s.roomNum}>{t('room')} {task.roomNumber}</span>
                                        <span className={`${s.priPill} ${PRI_CLS[task.priority] ?? s.priMedium}`}>
                                            {t(PRI_LABEL_KEY[task.priority] ?? 'priorityMedium')}
                                        </span>
                                    </div>
                                    <div className={s.taskType}>{task.type.replace(/_/g," ")}</div>
                                    {task.assignedTo && <div className={s.taskAssigned}>👤 {task.assignedTo}</div>}
                                    {task.notes && <div className={s.taskNotes}>{task.notes}</div>}
                                    <div className={s.taskTime}>{new Date(task.scheduledAt).toLocaleString()}</div>
                                    <div className={s.taskActions}>
                                        {col === "PENDING" && (
                                            <button type="button" className={s.btnStart} onClick={() => updateStatus(task.id, "IN_PROGRESS")}>{t('startTask')}</button>
                                        )}
                                        {col === "IN_PROGRESS" && (
                                            <button type="button" className={s.btnDone} onClick={() => updateStatus(task.id, "DONE")}>{t('doneTask')}</button>
                                        )}
                                        {(col === "PENDING" || col === "IN_PROGRESS") && (
                                            <button type="button" className={s.btnSkip} onClick={() => updateStatus(task.id, "SKIPPED")}>{t('skipTask')}</button>
                                        )}
                                        <button type="button" className={s.btnDelete} onClick={() => deleteTask(task.id)}>{t('delete')}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
