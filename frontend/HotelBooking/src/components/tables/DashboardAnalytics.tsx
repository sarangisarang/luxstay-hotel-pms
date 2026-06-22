"use client";
/**
 * Admin Dashboard page (fixed & polished)
 * - Route guard: only logged-in ADMIN can view
 * - Fetches stats + recent bookings/guests/rooms
 * - Adds a proper refresh without full reload
 * - Safer data parsing for array/{content: []}
 * - Nice Tailwind UI with cards & tables + subtle skeleton loaders
 * - Uses axios instance at "@/components/lib/axiosConfig"
 *
 * NOTE: Adjust API endpoints if your backend paths differ.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import styles from "@/styles/Dashboard.module.css";
import AiInsightCard from "@/components/AiInsightCard";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

// -------------------- Types --------------------
export type DashboardStats = {
    totalBookings: number;
    activeBookings: number;
    totalGuests: number;
    occupiedRooms: number;
    freeRooms: number;
    revenueToday?: number;
    revenueMonth?: number;
};

export type BookingRow = {
    id: string;
    guestName: string;
    roomNumber: string;
    checkInDate: string; // ISO string
    checkOutDate: string; // ISO string
    bookingStatus: string; // e.g., PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT
    totalAmount?: number | string;
};

export type GuestRow = {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    createdAt?: string;
};

export type RoomRow = {
    id: string;
    roomNumber: string;
    roomType?: string; // <- MUST be string for rendering
    roomStatus?: string; // e.g., FREE, RESERVED, OCCUPIED, MAINTENANCE
    pricePerNight?: number | string;
};

// -------------------- Helpers --------------------
function fmtDate(d?: string) {
    if (!d) return "-";
    const dd = new Date(d);
    return Number.isNaN(dd.valueOf())
        ? d
        : dd.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
}

function fmtMoney(v?: number | string) {
    if (v === undefined || v === null) return "-";
    const n = typeof v === "string" ? Number(v) : v;
    if (Number.isNaN(n)) return String(v);
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

// small statistic card
function StatCard(props: { label: string; value: number | string; subLabel?: string }) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statLabel}>{props.label}</div>
            <div className={styles.statValue}>{props.value}</div>
            {props.subLabel && <div className={styles.statSub}>{props.subLabel}</div>}
        </div>
    );
}

function SkeletonLine({ w = "full" }: { w?: string }) {
    return <div className={`skeleton h-4 w-${w}`} />;
}

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="space-y-3">
            {[...Array(rows)].map((_, r) => (
                <div key={r} className="grid grid-cols-12 gap-3">
                    {[...Array(cols)].map((__, c) => (
                        <SkeletonLine key={c} w="full" />
                    ))}
                </div>
            ))}
        </div>
    );
}

function Card(props: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{props.title}</h3>
                {props.action}
            </div>
            <div className={styles.cardBody}>{props.children}</div>
        </div>
    );
}

// Parse either an array or an object with `content: []`
function toList<T = any>(x: any): T[] {
    if (Array.isArray(x)) return x as T[];
    if (Array.isArray(x?.content)) return x.content as T[];
    return [] as T[];
}

function badgeClass(kind?: string): string {
    switch ((kind ?? "").toUpperCase()) {
        case "CONFIRMED":
        case "CHECKED_IN":
        case "FREE":
            return `${styles.badge} ${styles.badgeGreen}`;
        case "PENDING":
        case "RESERVED":
            return `${styles.badge} ${styles.badgeAmber}`;
        case "CANCELLED":
        case "CHECKED_OUT":
        case "COMPLETED":
            return `${styles.badge} ${styles.badgeSlate}`;
        case "OCCUPIED":
        case "MAINTENANCE":
            return `${styles.badge} ${styles.badgeRed}`;
        default:
            return `${styles.badge} ${styles.badgeSlate}`;
    }
}

// -------------------- Page --------------------
export default function AdminPage() {
  const { t } = useTranslation();
    const router = useRouter();

    // auth/guard
    const [authChecked, setAuthChecked] = useState(false);

    // data states
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [bookings, setBookings] = useState<BookingRow[]>([]);
    const [guests, setGuests] = useState<GuestRow[]>([]);
    const [rooms, setRooms] = useState<RoomRow[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 1) Guard: only ADMIN + token
    useEffect(() => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        if (!token || (role !== "ADMIN" && role !== "RECEPTION")) {
            router.replace("/login");
            return;
        }
        setAuthChecked(true);
    }, [router]);

    const statsFallback = useMemo<DashboardStats>(
        () => ({
            totalBookings: 0,
            activeBookings: 0,
            totalGuests: 0,
            occupiedRooms: 0,
            freeRooms: 0,
            revenueToday: 0,
            revenueMonth: 0,
        }),
        []
    );

    const load = useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true);
            setErr(null);

            try {
                const [statsRes, bookingsRes, guestsRes, roomsRes] = await Promise.all([
                    api.get("/api/admin/stats", { signal }),
                    api.get("/api/bookings", { params: { size: 5, page: 0 }, signal }),
                    api.get("/api/guests", { params: { size: 5, page: 0 }, signal }),
                    api.get("/api/rooms", { params: { size: 5, page: 0 }, signal }),
                ]);

                // ---- stats
                setStats((statsRes.data ?? null) as DashboardStats | null);

                // ---- bookings (usually already flat)
                setBookings(toList<BookingRow>(bookingsRes.data));

                // ---- guests: may come as { firstName, lastName } instead of { name }
                const rawGuests = toList<any>(guestsRes.data);
                const mappedGuests: GuestRow[] = rawGuests.map((g: any) => {
                    const fullName =
                        g.name ??
                        `${g.firstName ?? ""} ${g.lastName ?? ""}`.trim() ??
                        "-";

                    return {
                        id: String(g.id),
                        name: (fullName && fullName.length > 0 ? fullName : "-"),
                        email: g.email,
                        phone: g.phone,
                        createdAt: g.createdAt ?? g.created_date ?? g.created_at,
                    };
                });
                setGuests(mappedGuests);

                // ---- rooms: backend often returns roomType as OBJECT -> must flatten to roomType.name
                const rawRooms = toList<any>(roomsRes.data);
                const mappedRooms: RoomRow[] = rawRooms.map((r: any) => {
                    const rt = r.roomType; // can be string or object
                    const roomTypeName = typeof rt === "string" ? rt : (rt?.name ?? "-");

                    const price =
                        r.pricePerNight ??
                        r.price_per_night ??
                        rt?.pricePerNight ??
                        rt?.price_per_night ??
                        undefined;

                    return {
                        id: String(r.id),
                        roomNumber: String(r.roomNumber ?? r.number ?? "-"),
                        roomType: roomTypeName,
                        roomStatus: String(r.roomStatus ?? r.status ?? "-"),
                        pricePerNight: price,
                    };
                });
                setRooms(mappedRooms);
            } catch (e: any) {
                if (e?.name === "CanceledError" || e?.message?.includes("canceled")) return;
                const m =
                    e?.response?.data?.message ||
                    e?.response?.data?.error ||
                    e?.message ||
                    "Failed to load admin data.";
                setErr(m);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    // 2) Fetch dashboard data (with cancellation)
    useEffect(() => {
        if (!authChecked) return;
        const ctrl = new AbortController();
        load(ctrl.signal);
        return () => ctrl.abort();
    }, [authChecked, load]);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        const ctrl = new AbortController();
        try {
            await load(ctrl.signal);
        } finally {
            setIsRefreshing(false);
            ctrl.abort();
        }
    }, [load]);

    if (!authChecked) return null; // Wait until the guard runs to prevent flicker

    const s = stats ?? statsFallback;

    return (
        <div className={styles.page}>
            <AiInsightCard endpoint="/api/ai/insights/dashboard" title="AI Morning Briefing — Today's Priorities" />

            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>{t('adminDashboard')}</h1>
                    <p className={styles.pageSub}>{t('todayOperations')}</p>
                </div>
                <button
                    type="button"
                    className={styles.refreshBtn}
                    onClick={onRefresh}
                    disabled={isRefreshing}
                >
                    {isRefreshing ? t('refreshing') : "↻ " + t('refresh')}
                </button>
            </div>

            {/* Error banner */}
            {err && <div className={styles.errorBanner}>{err}</div>}

            {/* Stats grid */}
            <section>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {loading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className={styles.statCard}>
                                <SkeletonLine w="24" />
                                <SkeletonLine w="16" />
                            </div>
                        ))
                    ) : (
                        <>
                            <StatCard label={t('totalBookings2')}  value={s.totalBookings} />
                            <StatCard label={t('activeBookings2')} value={s.activeBookings} />
                            <StatCard label={t('totalGuests2')}    value={s.totalGuests} />
                            <StatCard label={t('occupiedRooms2')}  value={s.occupiedRooms} />
                            <StatCard label={t('freeRooms')}      value={s.freeRooms} />
                            <StatCard
                                label={t('revenueMonth')}
                                value={fmtMoney(s.revenueMonth ?? 0)}
                                subLabel={`Today: ${fmtMoney(s.revenueToday ?? 0)}`}
                            />
                        </>
                    )}
                </div>
            </section>

            {/* Recent Bookings & Guests */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card
                    title={t('recentBookings2')}
                    action={<a href="/bookings" className={styles.cardAction}>{t('viewAll')}</a>}
                >
                    {loading ? (
                        <div className={styles.skeletonGrid}>
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={styles.skeletonRow}>
                                    <SkeletonLine /><SkeletonLine /><SkeletonLine />
                                </div>
                            ))}
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className={styles.empty}>{t('noBookingsYet')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>{t('guest')}</th><th>{t('room')}</th><th>{t('checkIn')}</th>
                                        <th>{t('checkOut')}</th><th>{t('status')}</th><th>{t('total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map(b => (
                                        <tr key={b.id}>
                                            <td>{b.guestName || "-"}</td>
                                            <td>{b.roomNumber || "-"}</td>
                                            <td>{fmtDate(b.checkInDate)}</td>
                                            <td>{fmtDate(b.checkOutDate)}</td>
                                            <td><span className={badgeClass(b.bookingStatus)}>{b.bookingStatus || "-"}</span></td>
                                            <td>{fmtMoney(b.totalAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <Card
                    title={t('newGuests')}
                    action={<a href="/guests" className={styles.cardAction}>{t('viewAll')}</a>}
                >
                    {loading ? (
                        <div className={styles.skeletonGrid}>
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={styles.skeletonRow}>
                                    <SkeletonLine /><SkeletonLine />
                                </div>
                            ))}
                        </div>
                    ) : guests.length === 0 ? (
                        <div className={styles.empty}>{t('noGuestsFound')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className={styles.table}>
                                <thead>
                                    <tr><th>{t('name')}</th><th>{t('email')}</th><th>{t('phone')}</th><th>{t('joined')}</th></tr>
                                </thead>
                                <tbody>
                                    {guests.map(g => (
                                        <tr key={g.id}>
                                            <td>{g.name}</td>
                                            <td>{g.email ?? "-"}</td>
                                            <td>{g.phone ?? "-"}</td>
                                            <td>{fmtDate(g.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </section>

            {/* Rooms snapshot */}
            <section>
                <Card
                    title={t('roomsSnapshot')}
                    action={<a href="/rooms" className={styles.cardAction}>{t('manageRooms')}</a>}
                >
                    {loading ? (
                        <div className={styles.skeletonGrid}>
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={styles.skeletonRow}>
                                    <SkeletonLine /><SkeletonLine /><SkeletonLine />
                                </div>
                            ))}
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className={styles.empty}>{t('noRoomsFound')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className={styles.table}>
                                <thead>
                                    <tr><th>{t('room')}</th><th>{t('type')}</th><th>{t('status')}</th><th>{t('pricePerNight')}</th></tr>
                                </thead>
                                <tbody>
                                    {rooms.map(r => (
                                        <tr key={r.id}>
                                            <td>{r.roomNumber}</td>
                                            <td>{r.roomType ?? "-"}</td>
                                            <td><span className={badgeClass(r.roomStatus)}>{r.roomStatus ?? "-"}</span></td>
                                            <td>{fmtMoney(r.pricePerNight)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </section>
        </div>
    );
}
