"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type ManifestRow = {
    bookingId: string; guestName: string; guestEmail: string;
    roomNumber: number | null; roomType: string;
    checkIn: string; checkOut: string;
    status: string; paymentStatus: string;
    totalAmount: number; nights: number;
};
type Manifest = {
    date: string;
    arrivals: ManifestRow[]; departures: ManifestRow[]; inHouse: ManifestRow[];
    totalArrivals: number; totalDepartures: number; totalInHouse: number;
};
type HTask = { id: string; roomNumber: number; type: string; status: string; priority: string; assignedTo?: string; scheduledAt: string };
type MReq  = { id: string; roomId?: string; category: string; priority: string; status: string; description: string; createdAt: string };
type Stats = { totalBookings: number; activeBookings: number; occupiedRooms: number; freeRooms: number; revenueToday: number };

const STATUS_COLOR: Record<string, string> = {
    CONFIRMED: "#4f46e5", CHECKED_IN: "#0891b2", CHECKED_OUT: "#d97706",
    COMPLETED: "#16a34a", CANCELLED: "#dc2626", PENDING: "#9333ea",
};
const PRI_COLOR: Record<string, string> = { HIGH: "#ef4444", URGENT: "#dc2626", MEDIUM: "#f59e0b", LOW: "#22c55e" };

function Badge({ text, color }: { text: string; color: string }) {
    return (
        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700,
            background: color + "18", color, border: `1px solid ${color}30` }}>
            {text.replace(/_/g, " ")}
        </span>
    );
}

function KpiCard({ label, value, sub, icon, accent = "#6366f1", href }: { label: string; value: string | number; sub?: string; icon: string; accent?: string; href?: string }) {
    const card = (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "16px 20px",
            borderLeft: `4px solid ${accent}`, boxShadow: "0 1px 4px rgba(0,0,0,.06)",
            cursor: href ? "pointer" : "default", transition: "box-shadow 150ms" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
                    {sub && <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 5 }}>{sub}</div>}
                </div>
                <span style={{ fontSize: "1.6rem", opacity: 0.8 }}>{icon}</span>
            </div>
        </div>
    );
    return href ? <Link href={href} style={{ textDecoration: "none" }}>{card}</Link> : card;
}

function SectionHeader({ title, count, href }: { title: string; count: number; href?: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 20 }}>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                {title} <span style={{ background: "#6366f1", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: "0.72rem", marginLeft: 6 }}>{count}</span>
            </h2>
            {href && <Link href={href} style={{ fontSize: "0.78rem", color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>View all →</Link>}
        </div>
    );
}

function GuestRow({ row, type }: { row: ManifestRow; type: "arrival" | "departure" | "inhouse" }) {
    const { t } = useTranslation();
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: type === "arrival" ? "#f0fdf4" : type === "departure" ? "#fff7ed" : "#f0f9ff",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                {type === "arrival" ? "🛬" : type === "departure" ? "🛫" : "🏨"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.875rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.guestName}</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {row.roomNumber ? `${t('room')} ${row.roomNumber} · ` : ""}{row.roomType} · {row.nights} {t('nights')}
                </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "0.75rem", color: "#374151", marginBottom: 3 }}>
                    €{row.totalAmount.toLocaleString()}
                </div>
                <Badge text={row.status} color={STATUS_COLOR[row.status] ?? "#6b7280"} />
            </div>
        </div>
    );
}

export default function OperationsPage() {
  const { t } = useTranslation();
    const today = new Date().toISOString().slice(0, 10);
    const [manifest, setManifest] = useState<Manifest | null>(null);
    const [htasks,   setHtasks]   = useState<HTask[]>([]);
    const [mreqs,    setMreqs]    = useState<MReq[]>([]);
    const [stats,    setStats]    = useState<Stats | null>(null);
    const [loading,  setLoading]  = useState(true);

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get(`/api/admin/manifest?date=${today}`),
            api.get("/api/housekeeping?status=PENDING&status=IN_PROGRESS").catch(() => ({ data: [] })),
            api.get("/api/maintenance?status=OPEN&status=IN_PROGRESS").catch(() => ({ data: [] })),
            api.get("/api/admin/stats"),
        ]).then(([m, h, mr, s]) => {
            setManifest(m.data);
            setHtasks(Array.isArray(h.data) ? h.data.slice(0, 8) : []);
            setMreqs(Array.isArray(mr.data) ? mr.data.slice(0, 6) : []);
            setStats(s.data);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const fmtEur = (v?: number) => v != null ? `€${v.toLocaleString("en-EU", { minimumFractionDigits: 0 })}` : "—";
    const occupancy = stats ? Math.round((stats.occupiedRooms / Math.max(stats.occupiedRooms + stats.freeRooms, 1)) * 100) : 0;

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingOperations', 'Loading operations…')}</p></div>
    );

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('operationsCenter', 'Operations Center')}</h1>
                    <p className="page-subtitle">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <button type="button" className="btn-secondary" onClick={load}>↻ {t('refresh')}</button>
            </div>

            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 4 }}>
                <KpiCard label={t('arrivalsToday', 'Arrivals Today')}    value={manifest?.totalArrivals ?? 0}   icon="🛬" accent="#22c55e" href="/manifest" />
                <KpiCard label={t('departuresToday', 'Departures Today')} value={manifest?.totalDepartures ?? 0} icon="🛫" accent="#f59e0b" href="/manifest" />
                <KpiCard label={t('inHouse', 'In-House')}                value={manifest?.totalInHouse ?? 0}    icon="🏨" accent="#3b82f6" href="/bookings" />
                <KpiCard label={t('occupancyLabel')}                     value={`${occupancy}%`}                icon="📊" accent="#6366f1" sub={`${stats?.occupiedRooms ?? 0} / ${(stats?.occupiedRooms ?? 0) + (stats?.freeRooms ?? 0)} ${t('rooms')}`} />
                <KpiCard label={t('revenueToday', 'Revenue Today')}      value={fmtEur(stats?.revenueToday)}    icon="💶" accent="#8b5cf6" href="/reconciliation" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                {/* Arrivals */}
                <div className="data-card" style={{ padding: "16px 20px" }}>
                    <SectionHeader title={t('todaysArrivals', "Today's Arrivals")} count={manifest?.arrivals.length ?? 0} href="/manifest" />
                    {(manifest?.arrivals ?? []).length === 0 ? (
                        <p style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "12px 0" }}>{t('noArrivalsToday')}</p>
                    ) : (
                        (manifest?.arrivals ?? []).slice(0, 6).map(r => <GuestRow key={r.bookingId} row={r} type="arrival" />)
                    )}
                    {(manifest?.arrivals.length ?? 0) > 6 && (
                        <Link href="/manifest" style={{ fontSize: "0.78rem", color: "#6366f1", fontWeight: 600, textDecoration: "none", display: "block", marginTop: 8 }}>
                            +{(manifest!.arrivals.length - 6)} more →
                        </Link>
                    )}
                </div>

                {/* Departures */}
                <div className="data-card" style={{ padding: "16px 20px" }}>
                    <SectionHeader title={t('todaysDepartures', "Today's Departures")} count={manifest?.departures.length ?? 0} href="/manifest" />
                    {(manifest?.departures ?? []).length === 0 ? (
                        <p style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "12px 0" }}>{t('noDeparturesToday')}</p>
                    ) : (
                        (manifest?.departures ?? []).slice(0, 6).map(r => <GuestRow key={r.bookingId} row={r} type="departure" />)
                    )}
                    {(manifest?.departures.length ?? 0) > 6 && (
                        <Link href="/manifest" style={{ fontSize: "0.78rem", color: "#6366f1", fontWeight: 600, textDecoration: "none", display: "block", marginTop: 8 }}>
                            +{(manifest!.departures.length - 6)} more →
                        </Link>
                    )}
                </div>

                {/* Housekeeping */}
                <div className="data-card" style={{ padding: "16px 20px" }}>
                    <SectionHeader title={t('pendingHousekeeping', 'Pending Housekeeping')} count={htasks.length} href="/housekeeping" />
                    {htasks.length === 0 ? (
                        <p style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "12px 0" }}>✓ {t('allRoomsClean', 'All rooms clean')}</p>
                    ) : (
                        htasks.map(task => (
                            <div key={task.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                                <span style={{ fontSize: "1.2rem" }}>🧹</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>{t('room')} {task.roomNumber} — {task.type.replace(/_/g, " ")}</div>
                                    {task.assignedTo && <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>👤 {task.assignedTo}</div>}
                                </div>
                                <Badge text={task.priority} color={PRI_COLOR[task.priority] ?? "#6b7280"} />
                            </div>
                        ))
                    )}
                </div>

                {/* Maintenance */}
                <div className="data-card" style={{ padding: "16px 20px" }}>
                    <SectionHeader title={t('openMaintenance', 'Open Maintenance')} count={mreqs.length} href="/maintenance" />
                    {mreqs.length === 0 ? (
                        <p style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "12px 0" }}>✓ {t('noOpenIssues', 'No open issues')}</p>
                    ) : (
                        mreqs.map(r => (
                            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                                <span style={{ fontSize: "1.2rem" }}>🔧</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</div>
                                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{r.category.replace(/_/g, " ")} · {r.status}</div>
                                </div>
                                <Badge text={r.priority} color={PRI_COLOR[r.priority] ?? "#6b7280"} />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: 20 }}>
                <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>{t('quickActions', 'Quick Actions')}</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                        { label: "➕ New Booking",    href: "/add-bookings",    color: "#6366f1" },
                        { label: "👤 Check-In",       href: "/checkins",         color: "#22c55e" },
                        { label: "📋 Today's Manifest",href: "/manifest",         color: "#3b82f6" },
                        { label: "🛎️ Service Request", href: "/add-service-request", color: "#f59e0b" },
                        { label: "🧹 Housekeeping",   href: "/housekeeping",     color: "#8b5cf6" },
                        { label: "🔧 Maintenance",    href: "/maintenance",      color: "#ef4444" },
                        { label: "💳 Add Payment",    href: "/add-payment",      color: "#0891b2" },
                        { label: "📊 Reports",        href: "/reports",          color: "#475569" },
                    ].map(({ label, href, color }) => (
                        <Link key={href} href={href} style={{
                            padding: "10px 18px", borderRadius: 10, fontWeight: 600, fontSize: "0.875rem",
                            background: color + "12", color, border: `1px solid ${color}30`,
                            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
                            transition: "all 150ms",
                        }}>
                            {label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
