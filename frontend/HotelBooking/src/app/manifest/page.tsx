"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type BookingRow = {
    bookingId: string;
    guestName: string;
    guestEmail: string;
    roomNumber: number | null;
    roomType: string;
    checkIn: string;
    checkOut: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    nights: number;
};

type Manifest = {
    date: string;
    arrivals: BookingRow[];
    departures: BookingRow[];
    inHouse: BookingRow[];
    totalArrivals: number;
    totalDepartures: number;
    totalInHouse: number;
};

const STATUS_COLOR: Record<string, string> = {
    CONFIRMED:   "#4f46e5",
    CHECKED_IN:  "#0891b2",
    CHECKED_OUT: "#d97706",
    COMPLETED:   "#16a34a",
    CANCELLED:   "#dc2626",
    PENDING:     "#9333ea",
};

const PAYMENT_COLOR: Record<string, string> = {
    PAID:    "#16a34a",
    PENDING: "#d97706",
    UNPAID:  "#dc2626",
};

function fmt(n: number) {
    return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n ?? 0);
}

function StatusBadge({ value, colorMap }: { value: string; colorMap: Record<string, string> }) {
    const color = colorMap[value] ?? "#6b7280";
    return (
        <span style={{
            display: "inline-block", padding: "2px 8px", borderRadius: 6,
            background: color + "20", color, border: `1px solid ${color}50`,
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.03em",
        }}>
            {value}
        </span>
    );
}

function BookingTable({ rows, emptyMsg }: { rows: BookingRow[]; emptyMsg: string }) {
    const { t } = useTranslation();
    if (rows.length === 0) {
        return <p style={{ color: "#9ca3af", padding: "16px 0", fontSize: "0.88rem" }}>{emptyMsg}</p>;
    }
    return (
        <div style={{ overflowX: "auto" }}>
            <table className="ui-table" style={{ minWidth: 680 }}>
                <thead>
                    <tr>
                        <th>{t('guest')}</th>
                        <th>{t('room')}</th>
                        <th>{t('dates')}</th>
                        <th>{t('nights')}</th>
                        <th>{t('status')}</th>
                        <th>{t('payment')}</th>
                        <th>{t('total')}</th>
                        <th>{t('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(b => (
                        <tr key={b.bookingId}>
                            <td>
                                <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{b.guestName}</div>
                                <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{b.guestEmail}</div>
                            </td>
                            <td>
                                <span style={{ fontWeight: 700 }}>#{b.roomNumber ?? "—"}</span>
                                <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{b.roomType}</div>
                            </td>
                            <td style={{ fontSize: "0.82rem", color: "#374151" }}>
                                {b.checkIn} → {b.checkOut}
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: "#6366f1" }}>
                                {b.nights}
                            </td>
                            <td><StatusBadge value={b.status} colorMap={STATUS_COLOR} /></td>
                            <td><StatusBadge value={b.paymentStatus} colorMap={PAYMENT_COLOR} /></td>
                            <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(b.totalAmount)}</td>
                            <td>
                                <a
                                    href={`/bookings`}
                                    style={{
                                        fontSize: "0.72rem", padding: "4px 8px",
                                        borderRadius: 6, background: "#6366f1", color: "#fff",
                                        textDecoration: "none", fontWeight: 600,
                                    }}
                                >
                                    {t('view')}
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Section({
    title, icon, count, rows, emptyMsg, accentColor,
}: {
    title: string; icon: string; count: number; rows: BookingRow[];
    emptyMsg: string; accentColor: string;
}) {
    return (
        <div className="data-card" style={{ marginBottom: 20 }}>
            <div className="data-card-header" style={{ borderLeft: `4px solid ${accentColor}`, paddingLeft: 12 }}>
                <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                <span className="data-card-title" style={{ marginLeft: 8 }}>{title}</span>
                <span style={{
                    marginLeft: "auto", background: accentColor + "20", color: accentColor,
                    border: `1px solid ${accentColor}50`, borderRadius: 20,
                    padding: "2px 10px", fontSize: "0.8rem", fontWeight: 700,
                }}>
                    {count}
                </span>
            </div>
            <div style={{ padding: "12px 0 0" }}>
                <BookingTable rows={rows} emptyMsg={emptyMsg} />
            </div>
        </div>
    );
}

export default function ManifestPage() {
    const { t } = useTranslation();
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);
    const [manifest, setManifest] = useState<Manifest | null>(null);
    const [loading, setLoading] = useState(false);

    function load(d: string) {
        setLoading(true);
        api.get(`/api/admin/manifest?date=${d}`)
            .then(r => setManifest(r.data))
            .finally(() => setLoading(false));
    }

    useEffect(() => { load(today); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    function handlePrint() {
        window.print();
    }

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('dailyOperationsManifest')}</h1>
                    <p className="page-subtitle">{t('manifestSubtitle')}</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <input
                        type="date"
                        className="form-input"
                        style={{ width: 160 }}
                        value={date}
                        onChange={e => { setDate(e.target.value); load(e.target.value); }}
                    />
                    <button type="button" className="btn-secondary" onClick={handlePrint}>
                        🖨️ {t('print')}
                    </button>
                </div>
            </div>

            {/* KPI bar */}
            {manifest && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                    {[
                        { labelKey: "arrivalsToday",    value: manifest.totalArrivals,   icon: "🛬", color: "#4f46e5" },
                        { labelKey: "departuresToday",  value: manifest.totalDepartures, icon: "🛫", color: "#0891b2" },
                        { labelKey: "currentlyInHouse", value: manifest.totalInHouse,    icon: "🏨", color: "#16a34a" },
                    ].map(({ labelKey, value, icon, color }) => (
                        <div key={labelKey} style={{
                            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
                            padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
                        }}>
                            <span style={{ fontSize: "1.8rem" }}>{icon}</span>
                            <div>
                                <div style={{ fontSize: "1.8rem", fontWeight: 800, color }}>{value}</div>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>{t(labelKey)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {loading && (
                <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingManifest')}</p></div>
            )}

            {manifest && !loading && (
                <>
                    <Section
                        title={t('arrivals')}
                        icon="🛬"
                        count={manifest.totalArrivals}
                        rows={manifest.arrivals}
                        emptyMsg={t('noArrivalsToday')}
                        accentColor="#4f46e5"
                    />
                    <Section
                        title={t('departures')}
                        icon="🛫"
                        count={manifest.totalDepartures}
                        rows={manifest.departures}
                        emptyMsg={t('noDeparturesToday')}
                        accentColor="#0891b2"
                    />
                    <Section
                        title={t('inHouseGuests')}
                        icon="🏨"
                        count={manifest.totalInHouse}
                        rows={manifest.inHouse}
                        emptyMsg={t('noInHouseGuests')}
                        accentColor="#16a34a"
                    />
                </>
            )}
        </div>
    );
}
