"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Pref = {
    id?: string;
    guestId?: string;
    roomFloor?: string;
    bedType?: string;
    pillow?: string;
    smokingPreference?: string;
    viewPreference?: string;
    dietaryRestrictions?: string;
    allergies?: string;
    quietRoom?: boolean;
    highFloor?: boolean;
    accessibleRoom?: boolean;
    extraTowels?: boolean;
    extraPillows?: boolean;
    earlyCheckIn?: boolean;
    lateCheckOut?: boolean;
    specialRequests?: string;
    internalNotes?: string;
};

const ROOM_FLOOR_OPTS   = ["NO_PREFERENCE", "LOW", "MIDDLE", "HIGH"];
const BED_TYPE_OPTS     = ["NO_PREFERENCE", "KING", "QUEEN", "TWIN", "SINGLE"];
const PILLOW_OPTS       = ["NO_PREFERENCE", "SOFT", "FIRM", "MEMORY_FOAM"];
const SMOKING_OPTS      = ["NON_SMOKING", "SMOKING"];
const VIEW_OPTS         = ["NO_PREFERENCE", "SEA", "POOL", "GARDEN", "CITY", "MOUNTAIN"];
const DIETARY_OPTS      = ["VEGETARIAN", "VEGAN", "HALAL", "KOSHER", "GLUTEN_FREE", "DAIRY_FREE", "NUT_ALLERGY"];

const EMPTY: Pref = {
    roomFloor: "NO_PREFERENCE", bedType: "NO_PREFERENCE", pillow: "NO_PREFERENCE",
    smokingPreference: "NON_SMOKING", viewPreference: "NO_PREFERENCE",
    dietaryRestrictions: "", allergies: "", quietRoom: false, highFloor: false,
    accessibleRoom: false, extraTowels: false, extraPillows: false,
    earlyCheckIn: false, lateCheckOut: false, specialRequests: "", internalNotes: "",
};

function SelectField({ label, value, options, onChange }: { label: string; value?: string; options: string[]; onChange: (v: string) => void }) {
    return (
        <div>
            <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{label}</label>
            <select value={value ?? options[0]} onChange={e => onChange(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none", background: "#fff" }}>
                {options.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
            </select>
        </div>
    );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked?: boolean; onChange: (v: boolean) => void }) {
    return (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", cursor: "pointer", padding: "6px 0" }}>
            <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#6366f1" }} />
            {label}
        </label>
    );
}

export default function GuestPreferencesPage({ params }: { params: Promise<{ guestId: string }> }) {
    const { t } = useTranslation();
    const [guestId, setGuestId] = useState<string | null>(null);
    const [pref,    setPref]    = useState<Pref>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);
    const [saved,   setSaved]   = useState(false);

    useEffect(() => {
        params.then(p => {
            setGuestId(p.guestId);
            api.get(`/api/guests/${p.guestId}/preferences`)
                .then(r => setPref({ ...EMPTY, ...r.data }))
                .catch(() => setPref(EMPTY))
                .finally(() => setLoading(false));
        });
    }, [params]);

    const set = (k: keyof Pref, v: unknown) => setPref(f => ({ ...f, [k]: v }));

    const save = async () => {
        if (!guestId) return;
        setSaving(true);
        try {
            await api.put(`/api/guests/${guestId}/preferences`, pref);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch { alert("Save failed"); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="state-container"><div className="spinner" /></div>;

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('guestPreferences')}</h1>
                    <p className="page-subtitle">{t('preferencesSubtitle')}</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {saved && <span style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.875rem" }}>✓ {t('savedConfirm')}</span>}
                    <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                        {saving ? t('savingDots') : t('savePreferences')}
                    </button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Room Preferences */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>🛏️ {t('roomPreferences')}</div>
                    <div style={{ padding: 20, display: "grid", gap: 14 }}>
                        <SelectField label={t('floorPreference')}   value={pref.roomFloor}         options={ROOM_FLOOR_OPTS} onChange={v => set("roomFloor", v)} />
                        <SelectField label={t('bedType')}           value={pref.bedType}           options={BED_TYPE_OPTS}   onChange={v => set("bedType", v)} />
                        <SelectField label={t('pillowType')}        value={pref.pillow}            options={PILLOW_OPTS}     onChange={v => set("pillow", v)} />
                        <SelectField label={t('viewPreference')}    value={pref.viewPreference}    options={VIEW_OPTS}       onChange={v => set("viewPreference", v)} />
                        <SelectField label={t('smokingPreference')} value={pref.smokingPreference} options={SMOKING_OPTS}    onChange={v => set("smokingPreference", v)} />
                    </div>
                </div>

                {/* Room Features */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>⚙️ {t('roomFeaturesServices')}</div>
                    <div style={{ padding: 20 }}>
                        <CheckboxField label={t('quietRoom')}         checked={pref.quietRoom}      onChange={v => set("quietRoom", v)} />
                        <CheckboxField label={t('highFloorPreferred')} checked={pref.highFloor}     onChange={v => set("highFloor", v)} />
                        <CheckboxField label={t('accessibleRoom')}    checked={pref.accessibleRoom} onChange={v => set("accessibleRoom", v)} />
                        <CheckboxField label={t('extraTowels')}       checked={pref.extraTowels}    onChange={v => set("extraTowels", v)} />
                        <CheckboxField label={t('extraPillows')}      checked={pref.extraPillows}   onChange={v => set("extraPillows", v)} />
                        <CheckboxField label={t('earlyCheckInPref')}  checked={pref.earlyCheckIn}   onChange={v => set("earlyCheckIn", v)} />
                        <CheckboxField label={t('lateCheckOutPref')}  checked={pref.lateCheckOut}   onChange={v => set("lateCheckOut", v)} />
                    </div>
                </div>

                {/* Dietary */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>🍽️ {t('dietaryAllergies')}</div>
                    <div style={{ padding: 20, display: "grid", gap: 14 }}>
                        <div>
                            <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>{t('dietaryRestrictions')}</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {DIETARY_OPTS.map(d => {
                                    const list = (pref.dietaryRestrictions ?? "").split(",").map(s => s.trim()).filter(Boolean);
                                    const checked = list.includes(d);
                                    return (
                                        <label key={d} style={{
                                            display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                                            borderRadius: 20, border: `1px solid ${checked ? "#6366f1" : "#e5e7eb"}`,
                                            background: checked ? "#eef2ff" : "#fff", cursor: "pointer",
                                            fontSize: "0.8rem", fontWeight: checked ? 700 : 400, color: checked ? "#4f46e5" : "#374151",
                                        }}>
                                            <input type="checkbox" style={{ display: "none" }} checked={checked} onChange={() => {
                                                const newList = checked ? list.filter(x => x !== d) : [...list, d];
                                                set("dietaryRestrictions", newList.join(", "));
                                            }} />
                                            {d.replace(/_/g, " ")}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{t('allergiesFreeText')}</label>
                            <input type="text" value={pref.allergies ?? ""} onChange={e => set("allergies", e.target.value)} placeholder="e.g. Peanuts, Shellfish, Latex…"
                                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>📋 {t('requestsNotes')}</div>
                    <div style={{ padding: 20, display: "grid", gap: 14 }}>
                        <div>
                            <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{t('specialRequests')}</label>
                            <textarea rows={3} value={pref.specialRequests ?? ""} onChange={e => set("specialRequests", e.target.value)}
                                placeholder="Guest-visible special requests…"
                                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                            <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{t('internalNotesLabel')}</label>
                            <textarea rows={3} value={pref.internalNotes ?? ""} onChange={e => set("internalNotes", e.target.value)}
                                placeholder="Private notes visible only to staff…"
                                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #fef9ec", fontSize: "0.875rem", resize: "vertical", outline: "none", background: "#fefce8", boxSizing: "border-box" }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
