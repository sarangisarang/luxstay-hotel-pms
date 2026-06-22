"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { Settings, Building2, Clock, Globe, FileText, Star, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Hotel = {
    id: string;
    name: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    description?: string;
    checkInTime?: string;
    checkOutTime?: string;
    currency?: string;
    timezone?: string;
    website?: string;
    taxId?: string;
    cancellationPolicy?: string;
    starRating?: number;
    latitude?: number;
    longitude?: number;
};

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "AED", "SGD", "AUD", "CAD", "SEK"];
const TIMEZONES  = [
    "Europe/London","Europe/Paris","Europe/Berlin","Europe/Athens","Europe/Istanbul",
    "America/New_York","America/Chicago","America/Los_Angeles","Asia/Tokyo",
    "Asia/Dubai","Asia/Singapore","Australia/Sydney","Africa/Johannesburg",
];
const CHECK_TIMES = [
    "06:00","07:00","08:00","09:00","10:00","11:00","12:00",
    "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00",
];

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                <span style={{ color: "#6366f1" }}>{icon}</span>
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{title}</span>
            </div>
            <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {children}
            </div>
        </div>
    );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
    return (
        <div style={{ gridColumn: full ? "1 / -1" : "auto" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                {label}
            </label>
            {children}
        </div>
    );
}

const INPUT_STYLE = { width: "100%", padding: "9px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", background: "#f8fafc", color: "#0f172a" };
const SELECT_STYLE = { ...INPUT_STYLE, cursor: "pointer" };
const TEXTAREA_STYLE = { ...INPUT_STYLE, minHeight: 80, resize: "vertical" as const };

export default function HotelSettingsPage() {
  const { t } = useTranslation();
    const [hotels,   setHotels]   = useState<Hotel[]>([]);
    const [selected, setSelected] = useState<Hotel | null>(null);
    const [form,     setForm]     = useState<Partial<Hotel>>({});
    const [saving,   setSaving]   = useState(false);
    const [msg,      setMsg]      = useState<{ type: "ok" | "err"; text: string } | null>(null);

    useEffect(() => {
        api.get("/api/hotels").then(r => {
            const list: Hotel[] = Array.isArray(r.data) ? r.data : r.data?.content ?? [];
            setHotels(list);
            if (list.length > 0) { setSelected(list[0]); setForm(list[0]); }
        });
    }, []);

    const set = (k: keyof Hotel) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const selectHotel = (h: Hotel) => { setSelected(h); setForm(h); setMsg(null); };

    const save = async () => {
        if (!selected) return;
        setSaving(true); setMsg(null);
        try {
            await api.patch(`/api/hotels/${selected.id}/settings`, form);
            setMsg({ type: "ok", text: "Settings saved successfully." });
            api.get("/api/hotels").then(r => setHotels(Array.isArray(r.data) ? r.data : r.data?.content ?? []));
        } catch {
            setMsg({ type: "err", text: "Failed to save settings. Please try again." });
        } finally { setSaving(false); }
    };

    if (hotels.length === 0) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingHotels', 'Loading hotels…')}</p></div>
    );

    return (
        <div className="page-wrapper fade-in" style={{ maxWidth: 960 }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('hotelSettings', 'Hotel Settings')}</h1>
                    <p className="page-subtitle">{t('hotelSettingsSubtitle', 'Configure operational settings, policies and contact information')}</p>
                </div>
                <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                    {saving ? t('savingDots') : t('saveSettings')}
                </button>
            </div>

            {/* Hotel selector */}
            {hotels.length > 1 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                    {hotels.map(h => (
                        <button key={h.id} type="button"
                            onClick={() => selectHotel(h)}
                            className={selected?.id === h.id ? "btn-primary" : "btn-secondary"}
                            style={{ fontSize: "0.82rem" }}>
                            {h.name}
                        </button>
                    ))}
                </div>
            )}

            {msg && (
                <div className={msg.type === "ok" ? "feedback-success" : "feedback-error"} style={{ marginBottom: 16 }}>
                    {msg.type === "ok" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    {msg.text}
                </div>
            )}

            {/* Contact */}
            <Section icon={<Building2 size={16} />} title="Property Information">
                <Field label="Hotel Name">
                    <input style={INPUT_STYLE} value={form.name ?? ""} onChange={set("name")} />
                </Field>
                <Field label="Star Rating">
                    <select style={SELECT_STYLE} value={form.starRating ?? ""} onChange={set("starRating")}>
                        <option value="">—</option>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Star{n > 1 ? "s" : ""}</option>)}
                    </select>
                </Field>
                <Field label="Phone">
                    <input style={INPUT_STYLE} type="tel" value={form.phone ?? ""} onChange={set("phone")} placeholder="+1 555 000 0000" />
                </Field>
                <Field label="Email">
                    <input style={INPUT_STYLE} type="email" value={form.email ?? ""} onChange={set("email")} placeholder="info@hotel.com" />
                </Field>
                <Field label="Website">
                    <input style={INPUT_STYLE} type="url" value={form.website ?? ""} onChange={set("website")} placeholder="https://hotel.com" />
                </Field>
                <Field label="Tax / VAT ID">
                    <input style={INPUT_STYLE} value={form.taxId ?? ""} onChange={set("taxId")} placeholder="DE123456789" />
                </Field>
                <Field label="Address" full>
                    <input style={INPUT_STYLE} value={form.address ?? ""} onChange={set("address")} placeholder="123 Main Street" />
                </Field>
                <Field label="City">
                    <input style={INPUT_STYLE} value={form.city ?? ""} onChange={set("city")} placeholder="Berlin" />
                </Field>
                <Field label="Country">
                    <input style={INPUT_STYLE} value={form.country ?? ""} onChange={set("country")} placeholder="Germany" />
                </Field>
                <Field label="Description" full>
                    <textarea style={TEXTAREA_STYLE} value={form.description ?? ""} onChange={set("description")} placeholder="Brief hotel description shown to guests" />
                </Field>
            </Section>

            {/* Operations */}
            <Section icon={<Clock size={16} />} title="Operational Settings">
                <Field label="Check-in Time">
                    <select style={SELECT_STYLE} value={form.checkInTime ?? "15:00"} onChange={set("checkInTime")}>
                        {CHECK_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </Field>
                <Field label="Check-out Time">
                    <select style={SELECT_STYLE} value={form.checkOutTime ?? "11:00"} onChange={set("checkOutTime")}>
                        {CHECK_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </Field>
                <Field label="Default Currency">
                    <select style={SELECT_STYLE} value={form.currency ?? "EUR"} onChange={set("currency")}>
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </Field>
                <Field label="Timezone">
                    <select style={SELECT_STYLE} value={form.timezone ?? "Europe/Berlin"} onChange={set("timezone")}>
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                </Field>
            </Section>

            {/* Policies */}
            <Section icon={<FileText size={16} />} title="Policies">
                <Field label="Cancellation Policy" full>
                    <textarea style={TEXTAREA_STYLE} value={form.cancellationPolicy ?? ""} onChange={set("cancellationPolicy")}
                        placeholder="e.g. Free cancellation up to 24h before arrival. 1-night charge for late cancellations." />
                </Field>
            </Section>

            {/* Location */}
            <Section icon={<Globe size={16} />} title="Location (GPS Coordinates)">
                <Field label="Latitude">
                    <input style={INPUT_STYLE} type="number" step="0.000001" value={form.latitude ?? ""} onChange={set("latitude")} placeholder="52.520008" />
                </Field>
                <Field label="Longitude">
                    <input style={INPUT_STYLE} type="number" step="0.000001" value={form.longitude ?? ""} onChange={set("longitude")} placeholder="13.404954" />
                </Field>
            </Section>
        </div>
    );
}
