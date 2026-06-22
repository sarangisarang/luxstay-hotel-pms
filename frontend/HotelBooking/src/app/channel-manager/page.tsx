"use client";

import { useState, useEffect } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/ChannelManager.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Listing = {
    id: string;
    channel: string;
    status: string;
    roomTypeName: string | null;
    externalListingId: string | null;
    channelRate: number | null;
    commissionPct: number | null;
    minNights: number | null;
    maxNights: number | null;
    instantBook: boolean;
    lastSyncAt?: string | null;
};

type Reservation = {
    id: string;
    channel: string;
    externalReservationId: string;
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number | null;
    status: string;
    receivedAt: string;
};

type Stats = { activeListings: number; pendingReservations: number; confirmedReservations: number };

const CHANNEL_ICONS: Record<string, string> = {
    BOOKING_COM: "🔵", AIRBNB: "🔴", EXPEDIA: "🟡",
    HOTELS_COM: "🟠", DIRECT: "🟢", AGODA: "🔷", TRIPADVISOR: "🟩",
};

const STATUS_PILL_CLS: Record<string, string> = {
    ACTIVE: s.pillActive, PAUSED: s.pillPaused, ERROR: s.pillError,
    DISCONNECTED: s.pillDisconnected, PENDING: s.pillPending,
    CONFIRMED: s.pillConfirmed, CANCELLED: s.pillCancelled,
};

export default function ChannelManagerPage() {
  const { t } = useTranslation();
    const [tab,          setTab]          = useState<"listings" | "reservations">("listings");
    const [listings,     setListings]     = useState<Listing[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [stats,        setStats]        = useState<Stats | null>(null);
    const [loading,      setLoading]      = useState(true);
    const [syncing,      setSyncing]      = useState<string | null>(null);
    const [error,        setError]        = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get("/api/channels/listings"),
            api.get("/api/channels/reservations"),
            api.get("/api/channels/stats"),
        ]).then(([lr, rr, sr]) => {
            setListings(lr.data);
            setReservations(rr.data);
            setStats(sr.data);
        }).catch(() => setError("Failed to load channel data. Please refresh."))
          .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const syncListing = async (id: string) => {
        setSyncing(id);
        try { await api.post(`/api/channels/listings/${id}/sync`); load(); }
        catch { alert("Sync failed."); }
        finally { setSyncing(null); }
    };

    const confirmReservation = async (id: string) => {
        try { await api.patch(`/api/channels/reservations/${id}/confirm`); load(); }
        catch { alert("Failed to confirm."); }
    };

    const cancelReservation = async (id: string) => {
        if (!confirm(t('cancelReservationConfirm'))) return;
        try { await api.patch(`/api/channels/reservations/${id}/cancel`); load(); }
        catch { alert("Failed to cancel."); }
    };

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingChannelManager')}</p></div>
    );
    if (error) return (
        <div className="state-error">{error}</div>
    );

    return (
        <div className="page-wrapper fade-in">
            <div className={s.header}>
                <div>
                    <h1 className={s.title}>{t('channelManager')}</h1>
                    <p className={s.subtitle}>{t('manageOtaListings', 'Manage OTA listings and incoming reservations')}</p>
                </div>
                <a href="/channel-manager/add" className={s.connectBtn}>+ {t('connectChannel')}</a>
            </div>

            {/* Stats */}
            {stats && (
                <div className={s.statsGrid}>
                    <div className={s.statCard}>
                        <div className={`${s.statValue} ${s.statGreen}`}>{stats.activeListings}</div>
                        <div className={s.statLabel}>{t('activeListings', 'Active Listings')}</div>
                    </div>
                    <div className={s.statCard}>
                        <div className={`${s.statValue} ${s.statAmber}`}>{stats.pendingReservations}</div>
                        <div className={s.statLabel}>{t('pendingReservations', 'Pending Reservations')}</div>
                    </div>
                    <div className={s.statCard}>
                        <div className={`${s.statValue} ${s.statBlue}`}>{stats.confirmedReservations}</div>
                        <div className={s.statLabel}>{t('confirmedReservations', 'Confirmed Reservations')}</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className={s.tabs}>
                {(["listings", "reservations"] as const).map(tabKey => (
                    <button
                        type="button"
                        key={tabKey}
                        className={`${s.tab} ${tab === tabKey ? s.tabActive : ""}`}
                        onClick={() => setTab(tabKey)}
                    >
                        {tabKey === "listings" ? `${t('listingsTab')} (${listings.length})` : `${t('reservationsTab')} (${reservations.length})`}
                    </button>
                ))}
            </div>

            {/* Listings tab */}
            {tab === "listings" && (
                <div className={s.listingList}>
                    {listings.length === 0 && (
                        <div className={s.emptyState}>
                            <div className={s.emptyIcon}>🌐</div>
                            <div className={s.emptyTitle}>{t('noChannelsConnected', 'No channels connected')}</div>
                            <div className={s.emptyText}>Connect Booking.com, Airbnb, Expedia and more</div>
                        </div>
                    )}
                    {listings.map(l => (
                        <div key={l.id} className={s.listingCard}>
                            <div className={s.listingLeft}>
                                <span className={s.channelIcon}>{CHANNEL_ICONS[l.channel] ?? "🔗"}</span>
                                <div>
                                    <div className={s.listingName}>{(l.channel ?? "").replace("_", " ")} — {l.roomTypeName ?? "All rooms"}</div>
                                    <div className={s.listingMeta}>
                                        {l.externalListingId && <>{t('externalId')}: {l.externalListingId} · </>}
                                        {l.channelRate != null && <>€{l.channelRate}/{t('perNight').replace('/','').trim()} · </>}
                                        {l.commissionPct != null && <>{l.commissionPct}% {t('commissionLabel')} · </>}
                                        {t('minNightsLabel')} {l.minNights ?? 1} {t('nights')}
                                    </div>
                                    {l.lastSyncAt && (
                                        <div className={s.listingSync}>
                                            {t('lastSync')}: {new Date(l.lastSyncAt).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={s.listingRight}>
                                <span className={`${s.pill} ${STATUS_PILL_CLS[l.status] ?? s.pillDisconnected}`}>
                                    {l.status}
                                </span>
                                <button
                                    type="button"
                                    className={s.syncBtn}
                                    onClick={() => syncListing(l.id)}
                                    disabled={syncing === l.id}
                                >
                                    {syncing === l.id ? t('syncing') : t('syncNow')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reservations tab */}
            {tab === "reservations" && (
                <div className={s.tableWrap}>
                    <table className="ui-table">
                        <thead>
                            <tr>
                                <th>{t('channel', 'Channel')}</th>
                                <th>{t('guest')}</th>
                                <th>{t('dates', 'Dates')}</th>
                                <th>{t('total')}</th>
                                <th>{t('status')}</th>
                                <th>{t('received', 'Received')}</th>
                                <th>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reservations.length === 0 && (
                                <tr>
                                    <td colSpan={7} className={s.tableEmpty}>
                                        {t('noReservationsYet', 'No reservations yet')}
                                    </td>
                                </tr>
                            )}
                            {reservations.map(r => (
                                <tr key={r.id}>
                                    <td>
                                        {CHANNEL_ICONS[r.channel] ?? "🔗"} {(r.channel ?? "").replace("_", " ")}
                                    </td>
                                    <td>
                                        <div className={s.guestName}>{r.guestName}</div>
                                        <div className={s.guestEmail}>{r.guestEmail}</div>
                                    </td>
                                    <td className="cell-muted">{r.checkIn} → {r.checkOut}</td>
                                    <td className="cell-mono">{r.totalAmount != null ? `€${r.totalAmount}` : "—"}</td>
                                    <td>
                                        <span className={`${s.pill} ${STATUS_PILL_CLS[r.status] ?? s.pillDisconnected}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="cell-muted">{new Date(r.receivedAt).toLocaleDateString()}</td>
                                    <td>
                                        {r.status === "PENDING" && (
                                            <div className={s.actionRow}>
                                                <button type="button" className={s.confirmBtn} onClick={() => confirmReservation(r.id)}>
                                                    {t('confirm')}
                                                </button>
                                                <button type="button" className={s.cancelResBtn} onClick={() => cancelReservation(r.id)}>
                                                    {t('cancel')}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
