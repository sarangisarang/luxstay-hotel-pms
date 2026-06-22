"use client";

import { useState, useEffect } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/POS.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Charge = {
    id: string;
    bookingId: string;
    roomNumber: string;
    guestName: string;
    category: string;
    status: string;
    description: string;
    amount: number;
    quantity: number;
    staffMember: string;
    chargedAt: string;
};

type Stats = { pendingCount: number; pendingAmount: number };

const CATEGORIES = ["MINIBAR", "RESTAURANT", "SPA", "LAUNDRY", "PARKING", "ROOM_SERVICE", "TELEPHONE", "INTERNET", "EXCURSION", "OTHER"];
const CAT_ICONS: Record<string, string> = {
    MINIBAR: "🍷", RESTAURANT: "🍽️", SPA: "💆", LAUNDRY: "👔", PARKING: "🚗",
    ROOM_SERVICE: "🛎️", TELEPHONE: "📞", INTERNET: "🌐", EXCURSION: "🗺️", OTHER: "📦",
};

const STATUS_PILL_CLS: Record<string, string> = {
    PENDING: s.pillPending, ADDED_TO_BILL: s.pillBilled, PAID: s.pillPaid, VOIDED: s.pillVoided,
};

const FORM_FIELDS: { labelKey: string; key: string; placeholder: string; type?: string }[] = [
    { labelKey: "posBookingIdLabel", key: "bookingId",  placeholder: "UUID of booking" },
    { labelKey: "roomNumber",        key: "roomNumber",  placeholder: "e.g. 301" },
    { labelKey: "guestName",         key: "guestName",   placeholder: "Guest full name" },
    { labelKey: "description",       key: "description", placeholder: "e.g. 2x Mojito" },
    { labelKey: "posAmountEur",      key: "amount",      placeholder: "0.00", type: "number" },
    { labelKey: "qty",               key: "quantity",    placeholder: "1",    type: "number" },
    { labelKey: "staffMember",       key: "staffMember", placeholder: "Your name" },
];

const INIT_FORM = { bookingId: "", roomNumber: "", guestName: "", category: "ROOM_SERVICE", description: "", amount: "", quantity: "1", staffMember: "" };

export default function PosPage() {
  const { t } = useTranslation();
    const [charges,      setCharges]      = useState<Charge[]>([]);
    const [stats,        setStats]        = useState<Stats | null>(null);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [loading,      setLoading]      = useState(true);
    const [showAdd,      setShowAdd]      = useState(false);
    const [form,         setForm]         = useState<Record<string, string>>(INIT_FORM);
    const [saving,       setSaving]       = useState(false);
    const [error,        setError]        = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        Promise.all([api.get("/api/pos"), api.get("/api/pos/stats")])
            .then(([cr, sr]) => { setCharges(cr.data); setStats(sr.data); })
            .catch(() => setError("Failed to load POS data. Please refresh."))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const addCharge = async () => {
        if (!form.bookingId || !form.guestName || !form.amount) {
            alert("Booking ID, guest name, and amount are required.");
            return;
        }
        setSaving(true);
        try {
            await api.post("/api/pos", { ...form, amount: parseFloat(form.amount), quantity: parseInt(form.quantity) });
            setShowAdd(false);
            setForm(INIT_FORM);
            load();
        } catch { alert("Failed to add charge."); }
        finally { setSaving(false); }
    };

    const voidCharge = async (id: string) => {
        if (!confirm("Void this charge?")) return;
        try { await api.patch(`/api/pos/${id}/void`); load(); }
        catch { alert("Failed to void charge."); }
    };

    const filtered = statusFilter === "ALL" ? charges : charges.filter(c => c.status === statusFilter);
    const paidOrBilled = charges.filter(c => c.status === "PAID" || c.status === "ADDED_TO_BILL").length;

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingPos')}</p></div>
    );
    if (error) return <div className="state-error">{error}</div>;

    return (
        <div className="page-wrapper fade-in">
            <div className={s.header}>
                <div>
                    <h1 className={s.title}>{t('posRoomCharges')}</h1>
                    <p className={s.subtitle}>{t('posSubtitle')}</p>
                </div>
                <button type="button" className={s.addBtn} onClick={() => setShowAdd(true)}>+ {t('addCharge')}</button>
            </div>

            {/* Stats */}
            {stats && (
                <div className={s.statsGrid}>
                    <div className={s.statCard}>
                        <div className={`${s.statValue} ${s.statValueBlue}`}>{charges.length}</div>
                        <div className={s.statLabel}>{t('totalCharges')}</div>
                    </div>
                    <div className={s.statCard}>
                        <div className={`${s.statValue} ${s.statValueAmber}`}>{stats.pendingCount}</div>
                        <div className={s.statLabel}>{t('pending')}</div>
                    </div>
                    <div className={s.statCard}>
                        <div className={`${s.statValue} ${s.statValueRed}`}>€{stats.pendingAmount?.toFixed(2) ?? "0.00"}</div>
                        <div className={s.statLabel}>{t('pendingAmount')}</div>
                    </div>
                    <div className={s.statCard}>
                        <div className={`${s.statValue} ${s.statValueGreen}`}>{paidOrBilled}</div>
                        <div className={s.statLabel}>{t('paidOrBilled')}</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className={s.filters}>
                {["ALL", "PENDING", "ADDED_TO_BILL", "PAID", "VOIDED"].map(st => (
                    <button
                        type="button"
                        key={st}
                        className={`${s.filterBtn} ${statusFilter === st ? s.filterBtnActive : ""}`}
                        onClick={() => setStatusFilter(st)}
                    >
                        {st.replace("_", " ")}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className={s.tableWrap}>
                <table className="ui-table">
                    <thead>
                        <tr>
                            <th>{t('category')}</th>
                            <th>{t('guest')}</th>
                            <th>{t('room')}</th>
                            <th>{t('description')}</th>
                            <th>{t('amount')}</th>
                            <th>{t('status')}</th>
                            <th>{t('chargedAt')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={8} className={s.tableEmpty}>{t('noChargesFound')}</td>
                            </tr>
                        )}
                        {filtered.map(c => (
                            <tr key={c.id}>
                                <td>{CAT_ICONS[c.category] ?? "📦"} {c.category.replace("_", " ")}</td>
                                <td className="cell-name">{c.guestName}</td>
                                <td>{c.roomNumber || "—"}</td>
                                <td className="cell-muted">{c.description || "—"}</td>
                                <td className="cell-mono">€{(c.amount * (c.quantity || 1)).toFixed(2)}</td>
                                <td>
                                    <span className={`${s.pill} ${STATUS_PILL_CLS[c.status] ?? s.pillVoided}`}>
                                        {c.status.replace("_", " ")}
                                    </span>
                                </td>
                                <td className="cell-muted">{new Date(c.chargedAt).toLocaleDateString()}</td>
                                <td>
                                    {c.status === "PENDING" && (
                                        <button type="button" className={s.voidBtn} onClick={() => voidCharge(c.id)}>
                                            {t('voidCharge')}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Charge Modal */}
            {showAdd && (
                <div className={s.overlay}>
                    <div className={s.modal}>
                        <div className={s.modalTitle}>{t('addRoomCharge')}</div>
                        <div className={s.formFields}>
                            {FORM_FIELDS.map(f => (
                                <div key={f.key}>
                                    <label className={s.fieldLabel} htmlFor={`pos-${f.key}`}>{t(f.labelKey)}</label>
                                    <input
                                        id={`pos-${f.key}`}
                                        className={s.fieldInput}
                                        value={form[f.key]}
                                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        type={f.type ?? "text"}
                                    />
                                </div>
                            ))}
                            <div>
                                <label className={s.fieldLabel} htmlFor="pos-category">{t('category')}</label>
                                <select
                                    id="pos-category"
                                    className={s.fieldInput}
                                    value={form.category}
                                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c}>{CAT_ICONS[c]} {c.replace("_", " ")}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className={s.modalActions}>
                            <button type="button" className={s.cancelBtn} onClick={() => setShowAdd(false)}>{t('cancel')}</button>
                            <button type="button" className={s.saveBtn} onClick={addCharge} disabled={saving}>
                                {saving ? t('addingCharge') : t('addCharge')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
