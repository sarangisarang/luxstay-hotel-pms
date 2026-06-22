"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import Paginator from "@/components/ui/Paginator";
import s from "@/styles/Notifications.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Notification = {
    id: string;
    type: string;
    title: string;
    message: string;
    recipientRole: string | null;
    read: boolean;
    createdAt: string;
};

const TYPE_ICON: Record<string, string> = {
    BOOKING_CREATED: "📋",
    BOOKING_CANCELLED: "❌",
    GUEST_CHECKIN: "🏨",
    GUEST_CHECKOUT: "🚪",
    PAYMENT: "💳",
    MAINTENANCE: "🔧",
    HOUSEKEEPING: "🧹",
    LOW_OCCUPANCY: "📉",
    REVENUE_ALERT: "💰",
    SYSTEM: "⚙️",
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { t } = useTranslation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [page,          setPage]          = useState(0);
    const [totalPages,    setTotalPages]    = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    useEffect(() => {
        setLoading(true);
        api.get(`/api/notifications?page=${page}&size=${PAGE_SIZE}`)
            .then(r => {
                const d = r.data;
                setNotifications(d?.content ?? (Array.isArray(d) ? d : []));
                setTotalPages(d?.totalPages ?? 1);
                setTotalElements(d?.totalElements ?? 0);
            })
            .finally(() => setLoading(false));
    }, [page]);

    async function markRead(id: string) {
        await api.patch(`/api/notifications/${id}/read`);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }

    async function markAllRead() {
        await api.post("/api/notifications/mark-all-read");
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }

    const unread = notifications.filter(n => !n.read).length;

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loading')}</p></div>
    );

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('notifications')}</h1>
                    <p className="page-subtitle">{unread > 0 ? `${unread} ${t('notifUnread')}` : t('allCaughtUp')}</p>
                </div>
                {unread > 0 && (
                    <button type="button" className="btn-primary" onClick={markAllRead}>
                        {t('markAllAsRead')}
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="data-card">
                    <p className={s.empty}>{t('noNotificationsYetPage')}</p>
                </div>
            ) : (
                <div className="data-card" style={{ padding: 0 }}>
                    <div className={s.list}>
                        {notifications.map(n => (
                            <div key={n.id} className={`${s.item} ${n.read ? s.itemRead : s.itemUnread}`}>
                                <div className={s.itemIcon}>{TYPE_ICON[n.type] ?? "🔔"}</div>
                                <div className={s.itemBody}>
                                    <div className={s.itemTitle}>{n.title}</div>
                                    <div className={s.itemMsg}>{n.message}</div>
                                    <div className={s.itemMeta}>
                                        {new Date(n.createdAt).toLocaleString()}
                                        {n.recipientRole && <span className={s.rolePill}>{n.recipientRole}</span>}
                                    </div>
                                </div>
                                {!n.read && (
                                    <button type="button" className={s.readBtn} onClick={() => markRead(n.id)} aria-label="Mark as read">
                                        ✓
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <Paginator
                        page={page}
                        totalPages={totalPages}
                        totalElements={totalElements}
                        size={PAGE_SIZE}
                        onPageChange={setPage}
                    />
                </div>
            )}
        </div>
    );
}
