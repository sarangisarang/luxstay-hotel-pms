"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { Bell, Calendar, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "booking" | "checkin" | "service" | "payment";
  date: string;
}

function typeIcon(type: string) {
  switch (type) {
    case "checkin": return <CheckCircle size={16} color="#16a34a" />;
    case "service": return <AlertCircle size={16} color="#d97706" />;
    case "payment": return <Bell size={16} color="#7c3aed" />;
    default:        return <Calendar size={16} color="#2563eb" />;
  }
}

function typeBadgeClass(type: string) {
  switch (type) {
    case "checkin": return "badge badge-success";
    case "service": return "badge badge-warning";
    case "payment": return "badge badge-purple";
    default:        return "badge badge-info";
  }
}

export default function NotificationList() {
  const { t } = useTranslation();
  const [items, setItems]     = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  async function fetchNotifications() {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, serviceRes] = await Promise.allSettled([
        api.get("/api/bookings"),
        api.get("/api/servicerequests"),
      ]);

      const notifications: NotificationItem[] = [];

      if (bookingsRes.status === "fulfilled") {
        const bookings = Array.isArray(bookingsRes.value.data)
          ? bookingsRes.value.data
          : bookingsRes.value.data?.content ?? [];

        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

        bookings.slice(0, 30).forEach((b: {
          id: string;
          bookingStatus?: string;
          checkInDate?: string;
          checkOutDate?: string;
          guestName?: string;
          guest?: { firstName?: string; lastName?: string };
          room?: { roomNumber?: number };
          totalAmount?: number;
          createdAt?: string;
        }) => {
          const guest = b.guestName ?? (b.guest ? `${b.guest.firstName ?? ""} ${b.guest.lastName ?? ""}`.trim() : "Guest");
          const roomNum = b.room?.roomNumber ?? "?";

          if (b.bookingStatus === "CONFIRMED" && b.checkInDate === tomorrow) {
            notifications.push({
              id: `checkin-${b.id}`,
              title: t('checkInTomorrow'),
              message: `${guest} is checking into Room ${roomNum} tomorrow`,
              type: "checkin",
              date: b.checkInDate ?? today,
            });
          } else if (b.bookingStatus === "CONFIRMED" && b.checkInDate === today) {
            notifications.push({
              id: `checkin-today-${b.id}`,
              title: t('checkInToday'),
              message: `${guest} checks in to Room ${roomNum} today`,
              type: "checkin",
              date: b.checkInDate ?? today,
            });
          } else if (b.bookingStatus === "CONFIRMED") {
            notifications.push({
              id: `booking-${b.id}`,
              title: t('newBooking'),
              message: `${guest} booked Room ${roomNum} (€${b.totalAmount ?? 0})`,
              type: "booking",
              date: b.createdAt?.split("T")[0] ?? today,
            });
          }
        });
      }

      if (serviceRes.status === "fulfilled") {
        const requests = Array.isArray(serviceRes.value.data)
          ? serviceRes.value.data
          : serviceRes.value.data?.content ?? [];

        requests.slice(0, 10).forEach((sr: {
          id: string;
          status?: string;
          description?: string;
          service?: { name?: string };
          guest?: { firstName?: string; lastName?: string };
          requestedAt?: string;
        }) => {
          if (sr.status === "PENDING" || sr.status === "OPEN") {
            const guest = sr.guest ? `${sr.guest.firstName ?? ""} ${sr.guest.lastName ?? ""}`.trim() : "Guest";
            notifications.push({
              id: `service-${sr.id}`,
              title: t('serviceRequest'),
              message: `${guest} requested: ${sr.service?.name ?? sr.description ?? "Service"}`,
              type: "service",
              date: sr.requestedAt?.split("T")[0] ?? new Date().toISOString().split("T")[0],
            });
          }
        });
      }

      notifications.sort((a, b) => b.date.localeCompare(a.date));
      setItems(notifications.slice(0, 25));
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchNotifications(); }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('notifications')}</h1>
          <p className="page-subtitle">{t('notificationsSubtitle', 'Recent activity across bookings and service requests')}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchNotifications}>
          <RefreshCw size={14} /> {t('refresh')}
        </button>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">
            <Bell size={16} style={{ marginRight: 6 }} />
            {items.length} notification{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        {loading ? (
          <div className="state-container"><div className="spinner" /><p className="state-title">{t('loading')}</p></div>
        ) : error ? (
          <div className="state-container"><div className="state-icon">⚠️</div><p className="state-title">{error}</p></div>
        ) : items.length === 0 ? (
          <div className="state-container">
            <div className="state-icon"><Bell size={40} /></div>
            <p className="state-title">{t('noNotifications')}</p>
            <p className="state-desc">{t('allCaughtUp', 'All caught up! No pending activity.')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('type')}</th>
                  <th>{t('title', 'Title')}</th>
                  <th>{t('message', 'Message')}</th>
                  <th>{t('date')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(n => (
                  <tr key={n.id}>
                    <td>
                      <span className={typeBadgeClass(n.type)} style={{ display: "flex", alignItems: "center", gap: 4, width: "fit-content" }}>
                        {typeIcon(n.type)} {n.type}
                      </span>
                    </td>
                    <td><strong>{n.title}</strong></td>
                    <td className="cell-muted">{n.message}</td>
                    <td className="cell-muted">{n.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
