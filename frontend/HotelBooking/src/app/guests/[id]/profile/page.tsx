"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Guest = {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    nationality?: string;
    dateOfBirth?: string;
    passportNumber?: string;
    address?: string;
    city?: string;
    country?: string;
    loyaltyPoints?: number;
    loyaltyTier?: string;
    createdAt?: string;
};

type Booking = {
    id: string;
    roomNumber: number;
    checkInDate: string;
    checkOutDate: string;
    bookingStatus: string;
    totalAmount: number;
    paymentStatus: string;
    bookingSource?: string;
    createdAt?: string;
};

type ConciergeReq = {
    id: string;
    type: string;
    status: string;
    description?: string;
    createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
    CONFIRMED: "#22c55e", CHECKED_IN: "#6366f1", CHECKED_OUT: "#94a3b8",
    CANCELLED: "#ef4444", PENDING: "#f59e0b",
};

const TIER_COLORS: Record<string, string> = {
    SILVER: "#94a3b8", GOLD: "#f59e0b", PLATINUM: "#6366f1",
};

const fmt = (n: number) =>
    new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const TYPE_KEY: Record<string, string> = {
    TAXI_TRANSFER: "conciergeTaxiTransfer", RESTAURANT_RESERVATION: "conciergeRestaurant",
    TOUR_EXCURSION: "conciergeTourExcursion", WAKE_UP_CALL: "conciergeWakeUpCall",
    LUGGAGE_STORAGE: "conciergeLuggage", ROOM_SERVICE: "conciergeRoomService",
    SPA_APPOINTMENT: "conciergeSpa", CAR_RENTAL: "conciergeCarRental",
    AIRPORT_PICKUP: "conciergeAirportPickup", FLOWER_ARRANGEMENT: "conciergeFlowers",
    BIRTHDAY_PACKAGE: "conciergeBirthday", BUSINESS_SERVICES: "conciergeBusinessSvc",
    LAUNDRY: "conciergeLaundry", MEDICAL_ASSISTANCE: "conciergeMedical", OTHER: "conciergeOther",
};

export default function GuestProfilePage() {
  const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [guest, setGuest] = useState<Guest | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [concierge, setConcierge] = useState<ConciergeReq[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"bookings" | "concierge" | "preferences">("bookings");

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            api.get(`/api/guests/${id}`),
            api.get(`/api/bookings/guest/${id}`).catch(() => ({ data: [] })),
            api.get(`/api/concierge/guest/${id}`).catch(() => ({ data: [] })),
        ]).then(([g, b, c]) => {
            setGuest(g.data);
            setBookings(Array.isArray(b.data) ? b.data : []);
            setConcierge(Array.isArray(c.data) ? c.data : []);
        }).finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="state-container"><div className="spinner" /></div>;
    if (!guest) return <div className="state-container"><p className="state-title">{t('guestNotFound', 'Guest not found')}</p></div>;

    const totalSpent = bookings.filter(b => b.bookingStatus !== "CANCELLED").reduce((s, b) => s + (b.totalAmount ?? 0), 0);
    const completedStays = bookings.filter(b => b.bookingStatus === "CHECKED_OUT").length;
    const activeBooking = bookings.find(b => b.bookingStatus === "CHECKED_IN");
    const upcomingBooking = bookings.find(b => b.bookingStatus === "CONFIRMED");

    return (
        <div className="page-wrapper fade-in">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={() => router.back()} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: "0.875rem" }}>← {t('back', 'Back')}</button>
                    <div>
                        <h1 className="page-title">{guest.firstName} {guest.lastName}</h1>
                        <p className="page-subtitle">{t('guest360Profile', 'Guest 360° Profile')}</p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/guests/${id}/preferences`}><button className="btn-secondary">{t('preferences')}</button></Link>
                    <Link href={`/concierge`}><button className="btn-primary">+ {t('conciergeRequest', 'Concierge Request')}</button></Link>
                </div>
            </div>

            {/* Profile card */}
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, marginBottom: 20 }}>
                <div className="data-card" style={{ padding: 20 }}>
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "1.75rem", color: "#fff", fontWeight: 700 }}>
                            {guest.firstName[0]}{guest.lastName[0]}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{guest.firstName} {guest.lastName}</div>
                        {guest.loyaltyTier && guest.loyaltyTier !== "NONE" && (
                            <span style={{ background: TIER_COLORS[guest.loyaltyTier] + "20", color: TIER_COLORS[guest.loyaltyTier], border: `1px solid ${TIER_COLORS[guest.loyaltyTier]}40`, borderRadius: 20, padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700, display: "inline-block", marginTop: 6 }}>
                                {guest.loyaltyTier}
                            </span>
                        )}
                        {guest.loyaltyPoints != null && (
                            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>{guest.loyaltyPoints.toLocaleString()} pts</div>
                        )}
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {[
                            [["📧", t('email'), guest.email], ["📞", t('phone'), guest.phone],
                            ["🌍", t('nationality'), guest.nationality], ["🎂", t('dateOfBirth'), guest.dateOfBirth],
                            ["🪪", t('passport'), guest.passportNumber], ["🏠", t('city'), guest.city],
                            ["🗺️", t('country'), guest.country]]
                        ].filter(([,,v]) => v).map(([icon, label, value]) => (
                            <div key={String(label)} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                <span style={{ fontSize: "0.875rem" }}>{icon}</span>
                                <div>
                                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
                                    <div style={{ fontSize: "0.8rem", color: "#374151" }}>{String(value)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: 12, alignContent: "start" }}>
                    {[
                        { label: t('totalSpent'), value: fmt(totalSpent), color: "#6366f1", icon: "💰" },
                        { label: t('stays'), value: completedStays, color: "#22c55e", icon: "🛎️" },
                        { label: t('conciergeRequests', 'Concierge Requests'), value: concierge.length, color: "#f59e0b", icon: "🎩" },
                        { label: t('totalBookings'), value: bookings.length, color: "#3b82f6", icon: "📋" },
                    ].map(s => (
                        <div key={s.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", borderLeft: `4px solid ${s.color}` }}>
                            <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{s.icon}</div>
                            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{s.label}</div>
                            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>{s.value}</div>
                        </div>
                    ))}

                    {/* Status banners */}
                    {activeBooking && (
                        <div style={{ gridColumn: "1/-1", background: "#ecfdf5", border: "1px solid #86efac", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: 700, color: "#15803d" }}>🟢 {t('currentlyCheckedIn', 'Currently Checked In')}</div>
                                <div style={{ fontSize: "0.8rem", color: "#166534" }}>Room {activeBooking.roomNumber} · {activeBooking.checkInDate} → {activeBooking.checkOutDate}</div>
                            </div>
                            <Link href={`/bookings`}><button className="btn-secondary" style={{ fontSize: "0.8rem" }}>{t('viewAll')}</button></Link>
                        </div>
                    )}
                    {!activeBooking && upcomingBooking && (
                        <div style={{ gridColumn: "1/-1", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: 700, color: "#1d4ed8" }}>📅 {t('upcomingReservation', 'Upcoming Reservation')}</div>
                                <div style={{ fontSize: "0.8rem", color: "#1e40af" }}>Room {upcomingBooking.roomNumber} · Check-in {upcomingBooking.checkInDate}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {(["bookings", "concierge", "preferences"] as const).map(tabKey => (
                    <button key={tabKey} onClick={() => setTab(tabKey)}
                        style={{ padding: "8px 18px", borderRadius: 20, border: "1px solid", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
                            background: tab === tabKey ? "#0f172a" : "#fff", color: tab === tabKey ? "#fff" : "#374151", borderColor: tab === tabKey ? "#0f172a" : "#d1d5db" }}>
                        {tabKey === "bookings" ? `${t('bookings')} (${bookings.length})` : tabKey === "concierge" ? `${t('concierge', 'Concierge')} (${concierge.length})` : t('preferences')}
                    </button>
                ))}
            </div>

            {/* Bookings tab */}
            {tab === "bookings" && (
                <div className="data-card" style={{ overflow: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                                {[t('room'), t('checkIn'), t('checkOut'), t('amount'), t('status'), t('source', 'Source'), t('payments')].map(h => (
                                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map((b, i) => (
                                <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>#{b.roomNumber}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>{b.checkInDate}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>{b.checkOutDate}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem", fontWeight: 600 }}>{fmt(b.totalAmount ?? 0)}</td>
                                    <td style={{ padding: "10px 14px" }}>
                                        <span style={{ background: (STATUS_COLORS[b.bookingStatus] ?? "#94a3b8") + "20", color: STATUS_COLORS[b.bookingStatus] ?? "#94a3b8", border: `1px solid ${STATUS_COLORS[b.bookingStatus] ?? "#94a3b8"}40`, borderRadius: 6, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700 }}>
                                            {b.bookingStatus?.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.75rem", color: "#64748b" }}>{b.bookingSource?.replace(/_/g, " ") ?? "—"}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.75rem", color: b.paymentStatus === "PAID" ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>{b.paymentStatus}</td>
                                </tr>
                            ))}
                            {bookings.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>{t('noBookingsFound')}</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Concierge tab */}
            {tab === "concierge" && (
                <div style={{ display: "grid", gap: 10 }}>
                    {concierge.map(r => (
                        <div key={r.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{TYPE_KEY[r.type] ? t(TYPE_KEY[r.type]) : r.type}</div>
                                {r.description && <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{r.description}</div>}
                                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>{new Date(r.createdAt).toLocaleString()}</div>
                            </div>
                            <span style={{ background: "#6366f120", color: "#6366f1", border: "1px solid #6366f140", borderRadius: 6, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700 }}>{r.status.replace("_", " ")}</span>
                        </div>
                    ))}
                    {concierge.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", background: "#fff", borderRadius: 12 }}>{t('noConciergeRequests')}</div>}
                </div>
            )}

            {/* Preferences tab */}
            {tab === "preferences" && (
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚙️</div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{t('guestPreferences', 'Guest Preferences')}</div>
                    <p style={{ color: "#64748b", marginBottom: 16 }}>{t('preferencesDesc', 'Room preferences, dietary needs and special requirements')}</p>
                    <Link href={`/guests/${id}/preferences`}><button className="btn-primary">{t('managePreferences', 'Manage Preferences')}</button></Link>
                </div>
            )}
        </div>
    );
}
