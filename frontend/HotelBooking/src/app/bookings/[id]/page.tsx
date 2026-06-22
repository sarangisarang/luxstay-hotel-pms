"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import styles from "@/styles/BookingDetails.module.css"
import { useTranslation } from "react-i18next";
import "@/app/i18n";


export type Booking = {
    id: string;
    guestId?: string;
    guestName?: string;
    roomId?: string;
    roomNumber?: string | number;
    checkInDate: string;   // ISO
    checkOutDate: string;  // ISO
    paymentStatus?: string;
    bookingStatus?: string;
    totalAmount?: number;
    totalServiceAmount?: number;
    services?: { id: string; name: string }[];
};

function fmtDate(iso?: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(d);
}
function fmtMoney(n?: number, currency = "EUR") {
    if (typeof n !== "number" || !isFinite(n)) return "—";
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function StatusBadge({ label, tone = "slate" }: { label: string; tone?: "green"|"red"|"amber"|"slate"|"indigo" }) {
    const tones: Record<string, string> = {
        green:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        red:    "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
        amber:  "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
        slate:  "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
        indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {label}
    </span>
    );
}

export default function BookingDetailsPage() {
  const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setErr("");
                const res = await api.get(`/api/bookings/${id}`);
                const data = res.data as any;

                // ჰენდლინგი იმ შემთხვევისთვის, თუ ბექი აბრუნებს "TotalServiceAmount" (ზედა T-ით)
                const normalized: Booking = {
                    ...data,
                    totalServiceAmount:
                        typeof data?.totalServiceAmount === "number"
                            ? data.totalServiceAmount
                            : (data?.TotalServiceAmount as number | undefined),
                };

                if (!cancelled) setBooking(normalized);
            } catch (e: any) {
                if (!cancelled) setErr(e?.response?.data?.message || e?.message || "Failed to load booking.");
                console.error("Error fetching booking:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    const paymentTone = useMemo<"green"|"red"|"amber"|"slate">(() => {
        const s = (booking?.paymentStatus || "").toUpperCase();
        if (s.includes("PAID") || s === "COMPLETED") return "green";
        if (s.includes("PENDING")) return "amber";
        if (s.includes("FAILED") || s.includes("CANCEL")) return "red";
        return "slate";
    }, [booking?.paymentStatus]);

    const bookingTone = useMemo<"green"|"red"|"amber"|"slate"|"indigo">(() => {
        const s = (booking?.bookingStatus || "").toUpperCase();
        if (s === "CONFIRMED" || s === "CHECKED_IN") return "green";
        if (s === "PENDING") return "amber";
        if (s === "CANCELLED") return "red";
        if (s === "CHECKED_OUT") return "indigo";
        return "slate";
    }, [booking?.bookingStatus]);

    if (loading) {
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-1/2 bg-gray-200 rounded" />
                    <div className="h-24 w-full bg-gray-100 rounded" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="h-28 bg-gray-100 rounded" />
                        <div className="h-28 bg-gray-100 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (err) {
        return <div className="p-6 text-red-600 max-w-3xl mx-auto">⚠️ {err}</div>;
    }
    if (!booking) {
        return <div className="p-6 text-red-600 max-w-3xl mx-auto">{t('bookingNotFound', 'Booking not found.')}</div>;
    }

    return (
        <div className={styles.detailsContainer}>
            {/* Header */}
            <div className={styles.headerRow}>
                <h2 className={styles.title}>📄 {t('bookingDetails', 'Booking Details')}</h2>
                <span className={`${styles.status} ${styles[(booking.paymentStatus || 'slate').toLowerCase()]}`}>
        {booking.paymentStatus || '—'}
      </span>
            </div>

            {/* Cards grid */}
            <div className={styles.cardsGrid}>
                <div className={styles.card}>
                    <h3>👤 {t('guestLabel', 'Guest')}</h3>
                    <p><strong>{t('nameLabel', 'Name')}:</strong> {booking.guestName}</p>
                    <p><strong>{t('guestId', 'Guest ID')}:</strong> {booking.guestId}</p>
                </div>

                <div className={styles.card}>
                    <h3> 🛏️ {t('roomLabel', 'Room')}</h3>
                    <p><strong>{t('roomNumberLabel', 'Room Number')}:</strong> {booking.roomNumber}</p>
                    <p><strong>{t('roomIdLabel', 'Room ID')}:</strong> {booking.roomId}</p>
                </div>

                <div className={styles.card}>
                    <h3>📅 {t('datesLabel', 'Dates')}</h3>
                    <p><strong>{t('checkInLabel', 'Check-In')}:</strong> {fmtDate(booking.checkInDate)}</p>
                    <p><strong>{t('checkOutLabel', 'Check-Out')}:</strong> {fmtDate(booking.checkOutDate)}</p>
                </div>

                <div className={styles.card}>
                    <h3>💳 {t('paymentLabel', 'Payment')}</h3>
                    <p><strong>{t('totalLabel', 'Total')}:</strong> <span className={styles.priceStrong}>{fmtMoney(booking.totalAmount)}</span></p>
                    <p><strong>{t('servicesLabel', 'Services')}:</strong> <span className={styles.priceStrong}>{fmtMoney(booking.totalServiceAmount)}</span></p>
                </div>

                <div className={styles.card}>
                    <h3>🧰 {t('servicesLabel', 'Services')}</h3>
                    <div className={styles.services}>
                        {booking.services?.map(s => (
                            <span key={s.id} className={styles.serviceTag}>{s.name}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
