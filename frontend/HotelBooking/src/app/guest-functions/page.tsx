"use client";

import { useState } from "react";
import { Search, CalendarCheck, Hotel, XCircle, CheckCircle, Clock, Mail } from "lucide-react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/GuestFunctions.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Booking = {
    id: string;
    hotel: string;
    roomNumber: number;
    checkIn: string;
    checkOut: string;
    status: string;
    paymentStatus: string;
    total: number;
};

const STATUS_META: Record<string, { label: string; badgeCls: string; icon: React.ReactNode }> = {
    CONFIRMED:   { label: "Confirmed",   badgeCls: s.badgeConfirmed,  icon: <CheckCircle size={13} /> },
    CHECKED_IN:  { label: "Checked In",  badgeCls: s.badgeCheckedIn,  icon: <CheckCircle size={13} /> },
    CHECKED_OUT: { label: "Checked Out", badgeCls: s.badgeCheckedOut, icon: <Clock size={13} /> },
    COMPLETED:   { label: "Completed",   badgeCls: s.badgeCompleted,  icon: <CheckCircle size={13} /> },
    CANCELLED:   { label: "Cancelled",   badgeCls: s.badgeCancelled,  icon: <XCircle size={13} /> },
    PENDING:     { label: "Pending",     badgeCls: s.badgePending,    icon: <Clock size={13} /> },
};

function fmtDate(d: string) {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
    });
}

export default function GuestPortalPage() {
  const { t } = useTranslation();
    const [email,     setEmail]     = useState("");
    const [bookings,  setBookings]  = useState<Booking[] | null>(null);
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState<string | null>(null);
    const [cancelId,  setCancelId]  = useState<string | null>(null);
    const [cancelMsg, setCancelMsg] = useState<string | null>(null);

    async function lookup(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true); setError(null); setBookings(null); setCancelMsg(null);
        try {
            const res = await api.get(`/api/public/bookings/my-bookings?email=${encodeURIComponent(email.trim())}`);
            setBookings(res.data);
        } catch {
            setError("Could not retrieve bookings. Check your email and try again.");
        } finally { setLoading(false); }
    }

    async function cancel(id: string) {
        if (!confirm("Are you sure you want to cancel this booking?")) return;
        setCancelId(id);
        try {
            await api.post(`/api/public/bookings/${id}/cancel?email=${encodeURIComponent(email.trim())}`);
            setCancelMsg("Booking cancelled successfully.");
            setBookings(prev => prev
                ? prev.map(b => b.id === id ? { ...b, status: "CANCELLED" } : b)
                : prev
            );
        } catch { setError("Cancel request failed."); }
        finally { setCancelId(null); }
    }

    const canCancel = (status: string) => status === "CONFIRMED" || status === "PENDING";

    return (
        <div className={s.page}>
            {/* Hero */}
            <div className={s.hero}>
                <Hotel size={36} className={s.heroIcon} />
                <h1 className={s.heroTitle}>My Bookings</h1>
                <p className={s.heroSub}>Enter the email address you booked with to view your reservations</p>

                <form onSubmit={lookup} className={s.searchForm}>
                    <Mail size={18} className={s.searchIcon} />
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className={s.searchInput}
                    />
                    <button type="submit" disabled={loading} className={s.searchBtn}>
                        <Search size={15} /> {loading ? "Searching…" : "Find"}
                    </button>
                </form>
            </div>

            {/* Results */}
            <div className={s.results}>
                {error && <div className={s.bannerError}>{error}</div>}
                {cancelMsg && <div className={s.bannerSuccess}>{cancelMsg}</div>}

                {bookings !== null && (
                    <>
                        <p className={s.countLine}>
                            {bookings.length === 0
                                ? "No bookings found for this email."
                                : `${bookings.length} booking${bookings.length > 1 ? "s" : ""} found`}
                        </p>

                        {bookings.map(b => {
                            const meta = STATUS_META[b.status] ?? { label: b.status, badgeCls: s.badgeDefault, icon: null };
                            return (
                                <div key={b.id} className={s.card}>
                                    {/* Card header */}
                                    <div className={s.cardHead}>
                                        <div>
                                            <p className={s.cardHotel}>{b.hotel || "Hotel"} — Room {b.roomNumber}</p>
                                            <p className={s.cardRef}>#{b.id.split("-")[0].toUpperCase()}</p>
                                        </div>
                                        <span className={`${s.badge} ${meta.badgeCls}`}>
                                            {meta.icon} {meta.label}
                                        </span>
                                    </div>

                                    {/* Card body */}
                                    <div className={s.cardBody}>
                                        <div className={s.dateCols}>
                                            <div>
                                                <p className={s.dateLabel}>Check-in</p>
                                                <p className={s.dateValue}>{fmtDate(b.checkIn)}</p>
                                            </div>
                                            <div>
                                                <p className={s.dateLabel}>Check-out</p>
                                                <p className={s.dateValue}>{fmtDate(b.checkOut)}</p>
                                            </div>
                                            <div>
                                                <p className={s.dateLabel}>{t('total')}</p>
                                                <p className={s.totalValue}>€{Number(b.total).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {canCancel(b.status) && (
                                            <button
                                                type="button"
                                                onClick={() => cancel(b.id)}
                                                disabled={cancelId === b.id}
                                                className={s.cancelBtn}
                                            >
                                                <XCircle size={14} />
                                                {cancelId === b.id ? "Cancelling…" : "Cancel Booking"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}

                {bookings === null && !loading && !error && (
                    <div className={s.emptyState}>
                        <CalendarCheck size={44} className={s.emptyIcon} />
                        <p className={s.emptyText}>Enter your email above to view your bookings</p>
                    </div>
                )}
            </div>
        </div>
    );
}
