"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Group = {
    id: string;
    groupName: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    company?: string;
    occasion?: string;
    checkInDate: string;
    checkOutDate: string;
    roomCount: number;
    agreedRate?: number;
    currency?: string;
    breakfastIncluded?: boolean;
    mealPlan?: string;
    status: string;
    specialRequirements?: string;
    internalNotes?: string;
    depositAmount?: number;
    depositPaid?: boolean;
    createdAt?: string;
};

type Stats = { total: number; enquiry: number; provisional: number; confirmed: number; cancelled: number; completed: number };

const STATUS_META: Record<string, { bg: string; text: string; label: string }> = {
    ENQUIRY:     { bg: "#f0f9ff", text: "#0284c7", label: "Enquiry" },
    PROVISIONAL: { bg: "#fefce8", text: "#ca8a04", label: "Provisional" },
    CONFIRMED:   { bg: "#f0fdf4", text: "#16a34a", label: "Confirmed" },
    CANCELLED:   { bg: "#fef2f2", text: "#dc2626", label: "Cancelled" },
    COMPLETED:   { bg: "#f5f3ff", text: "#7c3aed", label: "Completed" },
};

const OCCASIONS = ["CORPORATE", "WEDDING", "CONFERENCE", "TOUR_GROUP", "OTHER"];
const MEAL_PLANS = ["NONE", "BB", "HB", "FB", "AI"];
const STATUSES = ["ENQUIRY", "PROVISIONAL", "CONFIRMED", "CANCELLED", "COMPLETED"];

const EMPTY: Partial<Group> = {
    groupName: "", contactName: "", contactEmail: "", contactPhone: "", company: "",
    occasion: "CORPORATE", checkInDate: "", checkOutDate: "", roomCount: 1,
    agreedRate: undefined, currency: "EUR", breakfastIncluded: false, mealPlan: "BB",
    status: "ENQUIRY", specialRequirements: "", internalNotes: "",
    depositAmount: undefined, depositPaid: false,
};

function StatusBadge({ status }: { status: string }) {
    const m = STATUS_META[status] ?? { bg: "#f1f5f9", text: "#6b7280", label: status };
    return (
        <span style={{ background: m.bg, color: m.text, borderRadius: 20, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
            {m.label}
        </span>
    );
}

function StatCard({ label, value, color = "#6366f1" }: { label: string; value: number; color?: string }) {
    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 18px", borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>{value}</div>
        </div>
    );
}

function fmtDate(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function nights(ci: string, co: string) {
    if (!ci || !co) return 0;
    return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000);
}

export default function GroupsPage() {
  const { t } = useTranslation();
    const [groups,  setGroups]  = useState<Group[]>([]);
    const [stats,   setStats]   = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search,  setSearch]  = useState("");
    const [filter,  setFilter]  = useState("ALL");
    const [showForm, setShowForm] = useState(false);
    const [editing,  setEditing]  = useState<Group | null>(null);
    const [form,     setForm]     = useState<Partial<Group>>(EMPTY);
    const [saving,   setSaving]   = useState(false);
    const [detail,   setDetail]   = useState<Group | null>(null);

    const load = () => {
        setLoading(true);
        Promise.all([api.get("/api/groups"), api.get("/api/groups/stats")])
            .then(([g, s]) => { setGroups(g.data); setStats(s.data); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

    const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
    const openEdit = (g: Group) => { setEditing(g); setForm(g); setShowForm(true); };

    const save = async () => {
        if (!form.groupName || !form.checkInDate || !form.checkOutDate) {
            alert("Group name, check-in and check-out dates are required.");
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/api/groups/${editing.id}`, form);
            } else {
                await api.post("/api/groups", form);
            }
            setShowForm(false);
            load();
        } catch { alert("Save failed"); }
        finally { setSaving(false); }
    };

    const changeStatus = async (id: string, status: string) => {
        await api.patch(`/api/groups/${id}/status`, { status });
        load();
    };

    const del = async (id: string) => {
        if (!confirm("Delete this group reservation?")) return;
        await api.delete(`/api/groups/${id}`);
        load();
    };

    const filtered = groups.filter(g => {
        const matchFilter = filter === "ALL" || g.status === filter;
        const matchSearch = !search || `${g.groupName} ${g.contactName ?? ""} ${g.company ?? ""}`.toLowerCase().includes(search.toLowerCase());
        return matchFilter && matchSearch;
    });

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingGroups', 'Loading group reservations…')}</p></div>
    );

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('groupReservations', 'Group Reservations')}</h1>
                    <p className="page-subtitle">{t('groupSubtitle', 'Corporate groups, weddings, conferences & tour groups')}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn-secondary" onClick={load}>↻ {t('refresh')}</button>
                    <button type="button" className="btn-primary" onClick={openNew}>+ {t('newGroup', 'New Group')}</button>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
                    <StatCard label={t('enquiry', 'Enquiry')}       value={stats.enquiry}     color="#0284c7" />
                    <StatCard label={t('provisional', 'Provisional')} value={stats.provisional} color="#ca8a04" />
                    <StatCard label={t('confirmed', 'Confirmed')}   value={stats.confirmed}   color="#16a34a" />
                    <StatCard label={t('cancelled', 'Cancelled')}   value={stats.cancelled}   color="#dc2626" />
                    <StatCard label={t('completed', 'Completed')}   value={stats.completed}   color="#7c3aed" />
                </div>
            )}

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <input
                    placeholder={t('searchGroups2', 'Search groups…')} value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", flex: 1, minWidth: 200, outline: "none" }}
                />
                {["ALL", ...STATUSES].map(s => (
                    <button key={s} type="button"
                        onClick={() => setFilter(s)}
                        style={{
                            padding: "7px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                            border: "1px solid #e5e7eb",
                            background: filter === s ? "#6366f1" : "#fff",
                            color: filter === s ? "#fff" : "#374151",
                        }}>
                        {s === "ALL" ? t('all') : STATUS_META[s]?.label ?? s}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="data-card" style={{ overflowX: "auto" }}>
                {filtered.length === 0 ? (
                    <div className="state-container"><p className="state-title">{t('noGroupsFound', 'No group reservations found')}</p></div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc" }}>
                                {[t('groupLabel', 'Group'), t('contact'), t('checkIn'), t('checkOut'), t('nights'), t('rooms'), t('ratePerNight', 'Rate/Night'), t('mealPlan', 'Meal'), t('status'), t('actions')].map(h => (
                                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((g, i) => (
                                <tr key={g.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "12px 14px" }}>
                                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{g.groupName}</div>
                                        {g.company && <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{g.company}</div>}
                                        {g.occasion && <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{g.occasion.replace("_", " ")}</div>}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <div style={{ fontWeight: 500 }}>{g.contactName ?? "—"}</div>
                                        {g.contactEmail && <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{g.contactEmail}</div>}
                                    </td>
                                    <td style={{ padding: "12px 14px", fontWeight: 500 }}>{fmtDate(g.checkInDate)}</td>
                                    <td style={{ padding: "12px 14px", fontWeight: 500 }}>{fmtDate(g.checkOutDate)}</td>
                                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#6366f1" }}>{nights(g.checkInDate, g.checkOutDate)}</td>
                                    <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700 }}>{g.roomCount}</td>
                                    <td style={{ padding: "12px 14px" }}>
                                        {g.agreedRate != null ? <span style={{ fontWeight: 600, color: "#16a34a" }}>€{g.agreedRate.toFixed(0)}</span> : <span style={{ color: "#94a3b8" }}>—</span>}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>{g.mealPlan ?? "—"}</span>
                                        {g.breakfastIncluded && <span style={{ marginLeft: 4, fontSize: "0.72rem", color: "#16a34a" }}>☕</span>}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}><StatusBadge status={g.status} /></td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button type="button" onClick={() => setDetail(g)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#f8fafc", cursor: "pointer", fontSize: "0.78rem" }}>{t('viewBtn')}</button>
                                            <button type="button" onClick={() => openEdit(g)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#f8fafc", cursor: "pointer", fontSize: "0.78rem" }}>{t('edit')}</button>
                                            <button type="button" onClick={() => del(g.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: "0.78rem" }}>{t('delete')}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Detail Modal */}
            {detail && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setDetail(null)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "90%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                            <div>
                                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>{detail.groupName}</h2>
                                {detail.company && <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>{detail.company} · {detail.occasion?.replace("_", " ")}</p>}
                            </div>
                            <StatusBadge status={detail.status} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                            {[
                                { labelKey: "contactNameLabel", label: "Contact", value: `${detail.contactName ?? "—"} · ${detail.contactEmail ?? ""} · ${detail.contactPhone ?? ""}` },
                                { labelKey: "dates", label: "Dates", value: `${fmtDate(detail.checkInDate)} → ${fmtDate(detail.checkOutDate)} (${nights(detail.checkInDate, detail.checkOutDate)} nights)` },
                                { labelKey: "rooms", label: "Rooms", value: `${detail.roomCount} rooms` },
                                { labelKey: "rate", label: "Rate", value: detail.agreedRate != null ? `€${detail.agreedRate}/night` : "TBD" },
                                { labelKey: "mealPlanLbl", label: "Meal Plan", value: detail.mealPlan ?? "None" },
                                { labelKey: "depositEur", label: "Deposit", value: detail.depositAmount != null ? `€${detail.depositAmount} ${detail.depositPaid ? "✅ Paid" : "⏳ Pending"}` : "—" },
                            ].map(({ labelKey, label, value }) => (
                                <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: 12 }}>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t(labelKey, label)}</div>
                                    <div style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: 500 }}>{value}</div>
                                </div>
                            ))}
                        </div>
                        {detail.specialRequirements && (
                            <div style={{ marginBottom: 12, padding: 14, background: "#f0fdf4", borderRadius: 10 }}>
                                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#16a34a", textTransform: "uppercase", marginBottom: 4 }}>{t('specialRequirements', 'Special Requirements')}</div>
                                <div style={{ fontSize: "0.85rem", color: "#0f172a" }}>{detail.specialRequirements}</div>
                            </div>
                        )}
                        {detail.internalNotes && (
                            <div style={{ marginBottom: 16, padding: 14, background: "#fef9ec", borderRadius: 10 }}>
                                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#ca8a04", textTransform: "uppercase", marginBottom: 4 }}>{t('internalNotes', 'Internal Notes')}</div>
                                <div style={{ fontSize: "0.85rem", color: "#0f172a" }}>{detail.internalNotes}</div>
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {STATUSES.filter(s => s !== detail.status).map(s => (
                                <button key={s} type="button" onClick={() => { changeStatus(detail.id, s); setDetail(null); }}
                                    style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: STATUS_META[s]?.bg ?? "#f8fafc", color: STATUS_META[s]?.text ?? "#374151", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
                                    → {STATUS_META[s]?.label ?? s}
                                </button>
                            ))}
                            <button type="button" onClick={() => { setDetail(null); openEdit(detail); }}
                                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #6366f1", background: "#6366f1", color: "#fff", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>
                                {t('edit')}
                            </button>
                            <button type="button" onClick={() => setDetail(null)}
                                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8fafc", color: "#374151", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", marginLeft: "auto" }}>
                                {t('close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showForm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowForm(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "90%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 20, color: "#0f172a" }}>{editing ? t('editGroupReservation', 'Edit Group Reservation') : t('newGroupReservation', 'New Group Reservation')}</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            {[
                                { labelKey: "groupNameRequired", label: "Group Name *", key: "groupName", type: "text" },
                                { labelKey: "companyLabel", label: "Company", key: "company", type: "text" },
                                { labelKey: "contactNameLabel", label: "Contact Name", key: "contactName", type: "text" },
                                { labelKey: "contactEmailLabel", label: "Contact Email", key: "contactEmail", type: "email" },
                                { labelKey: "contactPhoneLabel", label: "Contact Phone", key: "contactPhone", type: "tel" },
                            ].map(({ labelKey, label, key, type }) => (
                                <div key={key}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t(labelKey, label)}</label>
                                    <input type={type} value={(form as any)[key] ?? ""} onChange={e => set(key, e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('occasionLbl', 'Occasion')}</label>
                                <select value={form.occasion ?? "CORPORATE"} onChange={e => set("occasion", e.target.value)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }}>
                                    {OCCASIONS.map(o => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('checkIn')} *</label>
                                <input type="date" value={form.checkInDate ?? ""} onChange={e => set("checkInDate", e.target.value)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('checkOut')} *</label>
                                <input type="date" value={form.checkOutDate ?? ""} onChange={e => set("checkOutDate", e.target.value)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('roomCountRequired', 'Room Count *')}</label>
                                <input type="number" min="1" value={form.roomCount ?? 1} onChange={e => set("roomCount", parseInt(e.target.value))}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('agreedRateNight', 'Agreed Rate / Night (€)')}</label>
                                <input type="number" step="0.01" value={form.agreedRate ?? ""} onChange={e => set("agreedRate", parseFloat(e.target.value) || undefined)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('mealPlanLbl', 'Meal Plan')}</label>
                                <select value={form.mealPlan ?? "BB"} onChange={e => set("mealPlan", e.target.value)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }}>
                                    {MEAL_PLANS.map(m => <option key={m} value={m}>{m === "BB" ? "B&B" : m === "HB" ? "Half Board" : m === "FB" ? "Full Board" : m === "AI" ? "All Inclusive" : "Room Only"}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('status')}</label>
                                <select value={form.status ?? "ENQUIRY"} onChange={e => set("status", e.target.value)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }}>
                                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('depositEur', 'Deposit (€)')}</label>
                                <input type="number" step="0.01" value={form.depositAmount ?? ""} onChange={e => set("depositAmount", parseFloat(e.target.value) || undefined)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }} />
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('specialRequirements', 'Special Requirements')}</label>
                                <textarea rows={2} value={form.specialRequirements ?? ""} onChange={e => set("specialRequirements", e.target.value)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('internalNotes', 'Internal Notes')}</label>
                                <textarea rows={2} value={form.internalNotes ?? ""} onChange={e => set("internalNotes", e.target.value)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                                    <input type="checkbox" checked={!!form.breakfastIncluded} onChange={e => set("breakfastIncluded", e.target.checked)} />
                                    {t('breakfastIncluded', 'Breakfast Included')}
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                                    <input type="checkbox" checked={!!form.depositPaid} onChange={e => set("depositPaid", e.target.checked)} />
                                    {t('depositPaid', 'Deposit Paid')}
                                </label>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
                            <button type="button" onClick={() => setShowForm(false)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8fafc", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>{t('cancel')}</button>
                            <button type="button" onClick={save} disabled={saving} style={{ padding: "9px 24px", borderRadius: 8, background: "#6366f1", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
                                {saving ? t('saving', 'Saving…') : editing ? t('update', 'Update') : t('create', 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
