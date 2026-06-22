"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/ChannelManager.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type RoomType = { id: string; name: string };

const CHANNEL_TYPES = [
    "BOOKING_COM", "AIRBNB", "EXPEDIA", "HOTELS_COM", "DIRECT", "AGODA", "TRIPADVISOR",
];

const CHANNEL_LABELS: Record<string, string> = {
    BOOKING_COM: "Booking.com",
    AIRBNB: "Airbnb",
    EXPEDIA: "Expedia",
    HOTELS_COM: "Hotels.com",
    DIRECT: "Direct / Website",
    AGODA: "Agoda",
    TRIPADVISOR: "TripAdvisor",
};

export default function AddChannelListingPage() {
  const { t } = useTranslation();
    const router = useRouter();
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        channel: "BOOKING_COM",
        roomTypeId: "",
        roomTypeName: "",
        externalListingId: "",
        channelRate: "",
        commissionPct: "15",
        minNights: "1",
        maxNights: "30",
        instantBook: true,
        status: "ACTIVE",
    });

    useEffect(() => {
        api.get("/api/room-types").then(r => {
            const types = Array.isArray(r.data) ? r.data : [];
            setRoomTypes(types);
            if (types.length > 0) {
                setForm(f => ({ ...f, roomTypeId: types[0].id, roomTypeName: types[0].name }));
            }
        }).catch(() => {});
    }, []);

    function handleRoomType(id: string) {
        const rt = roomTypes.find(r => r.id === id);
        setForm(f => ({ ...f, roomTypeId: id, roomTypeName: rt?.name ?? "" }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            await api.post("/api/channels/listings", {
                channel: form.channel,
                roomTypeId: form.roomTypeId || null,
                roomTypeName: form.roomTypeName,
                externalListingId: form.externalListingId || null,
                channelRate: form.channelRate ? parseFloat(form.channelRate) : null,
                commissionPct: form.commissionPct ? parseFloat(form.commissionPct) : null,
                minNights: parseInt(form.minNights) || 1,
                maxNights: parseInt(form.maxNights) || 30,
                instantBook: form.instantBook,
                status: form.status,
            });
            router.push("/channel-manager");
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e?.response?.data?.message ?? "Failed to connect channel. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('connectOtaChannel', 'Connect OTA Channel')}</h1>
                    <p className="page-subtitle">{t('connectOtaSubtitle', 'Add a new distribution channel listing')}</p>
                </div>
                <button type="button" className="btn-secondary" onClick={() => router.push("/channel-manager")}>
                    ← Back
                </button>
            </div>

            <div className="form-card" style={{ maxWidth: 640, margin: "0 auto" }}>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                    {error && (
                        <div className="alert alert-error">{error}</div>
                    )}

                    {/* Channel type */}
                    <div className="form-field">
                        <label className="form-label">Channel / OTA</label>
                        <select
                            className="form-select"
                            value={form.channel}
                            onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                            required
                        >
                            {CHANNEL_TYPES.map(c => (
                                <option key={c} value={c}>{CHANNEL_LABELS[c] ?? c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Room type */}
                    {roomTypes.length > 0 && (
                        <div className="form-field">
                            <label className="form-label">Room Type</label>
                            <select
                                className="form-select"
                                value={form.roomTypeId}
                                onChange={e => handleRoomType(e.target.value)}
                            >
                                <option value="">— All room types —</option>
                                {roomTypes.map(rt => (
                                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* External listing ID */}
                    <div className="form-field">
                        <label className="form-label">External Listing ID</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="e.g. 1234567 (from OTA dashboard)"
                            value={form.externalListingId}
                            onChange={e => setForm(f => ({ ...f, externalListingId: e.target.value }))}
                        />
                    </div>

                    {/* Rate & commission */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="form-field">
                            <label className="form-label">Channel Rate (€/night)</label>
                            <input
                                className="form-input"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="e.g. 120.00"
                                value={form.channelRate}
                                onChange={e => setForm(f => ({ ...f, channelRate: e.target.value }))}
                            />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Commission %</label>
                            <input
                                className="form-input"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={form.commissionPct}
                                onChange={e => setForm(f => ({ ...f, commissionPct: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Min / max nights */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="form-field">
                            <label className="form-label">Min Nights</label>
                            <input
                                className="form-input"
                                type="number"
                                min="1"
                                value={form.minNights}
                                onChange={e => setForm(f => ({ ...f, minNights: e.target.value }))}
                            />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Max Nights</label>
                            <input
                                className="form-input"
                                type="number"
                                min="1"
                                value={form.maxNights}
                                onChange={e => setForm(f => ({ ...f, maxNights: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Instant book + status */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="form-field">
                            <label className="form-label">{t('status')}</label>
                            <select
                                className="form-select"
                                value={form.status}
                                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                            >
                                <option value="ACTIVE">{t('active')}</option>
                                <option value="INACTIVE">{t('inactive')}</option>
                                <option value="PAUSED">{t('paused', 'Paused')}</option>
                            </select>
                        </div>
                        <div className="form-field" style={{ justifyContent: "flex-end" }}>
                            <label className="form-label">{t('instantBook', 'Instant Book')}</label>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={form.instantBook}
                                    onChange={e => setForm(f => ({ ...f, instantBook: e.target.checked }))}
                                    style={{ width: 16, height: 16 }}
                                />
                                <span className="form-label" style={{ marginBottom: 0 }}>
                                    {t('instantBookDesc', 'Allow instant booking without approval')}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 8 }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => router.push("/channel-manager")}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? "Connecting…" : "Connect Channel"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
