"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type ConciergeRequest = {
    id: string;
    bookingId?: string;
    guestId?: string;
    guestName?: string;
    roomNumber?: number;
    type: string;
    status: string;
    description?: string;
    assignedTo?: string;
    requestedFor?: string;
    staffNotes?: string;
    createdAt: string;
    completedAt?: string;
};

const TYPE_KEY: Record<string, string> = {
    TAXI_TRANSFER: "conciergeTaxiTransfer",
    RESTAURANT_RESERVATION: "conciergeRestaurant",
    TOUR_EXCURSION: "conciergeTourExcursion",
    WAKE_UP_CALL: "conciergeWakeUpCall",
    LUGGAGE_STORAGE: "conciergeLuggage",
    ROOM_SERVICE: "conciergeRoomService",
    SPA_APPOINTMENT: "conciergeSpa",
    CAR_RENTAL: "conciergeCarRental",
    AIRPORT_PICKUP: "conciergeAirportPickup",
    FLOWER_ARRANGEMENT: "conciergeFlowers",
    BIRTHDAY_PACKAGE: "conciergeBirthday",
    BUSINESS_SERVICES: "conciergeBusinessSvc",
    LAUNDRY: "conciergeLaundry",
    MEDICAL_ASSISTANCE: "conciergeMedical",
    OTHER: "conciergeOther",
};

const TYPE_ICONS: Record<string, string> = {
    TAXI_TRANSFER: "🚕", RESTAURANT_RESERVATION: "🍽️", TOUR_EXCURSION: "🗺️",
    WAKE_UP_CALL: "⏰", LUGGAGE_STORAGE: "🧳", ROOM_SERVICE: "🛎️",
    SPA_APPOINTMENT: "💆", CAR_RENTAL: "🚗", AIRPORT_PICKUP: "✈️",
    FLOWER_ARRANGEMENT: "💐", BIRTHDAY_PACKAGE: "🎂", BUSINESS_SERVICES: "💼",
    LAUNDRY: "👔", MEDICAL_ASSISTANCE: "🏥", OTHER: "📋",
};

const STATUS_COLORS: Record<string, string> = {
    PENDING: "#f59e0b",
    IN_PROGRESS: "#6366f1",
    COMPLETED: "#22c55e",
    CANCELLED: "#94a3b8",
};

const BLANK: Partial<ConciergeRequest> = { status: "PENDING", type: "OTHER" };

export default function ConciergePage() {
  const { t } = useTranslation();
    const [requests, setRequests] = useState<ConciergeRequest[]>([]);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<Partial<ConciergeRequest> | null>(null);
    const [detail, setDetail] = useState<ConciergeRequest | null>(null);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        api.get("/api/concierge" + (statusFilter ? `?status=${statusFilter}` : ""))
            .then(r => setRequests(r.data))
            .finally(() => setLoading(false));
        api.get("/api/concierge/stats")
            .then(s => setStats(s.data))
            .catch(() => {});
    };

    useEffect(() => { load(); }, [statusFilter]);

    const save = async () => {
        if (!modal) return;
        setSaving(true);
        try {
            if (modal.id) await api.put(`/api/concierge/${modal.id}`, modal);
            else await api.post("/api/concierge", modal);
            setModal(null);
            load();
        } finally { setSaving(false); }
    };

    const patchStatus = async (id: string, status: string, notes?: string) => {
        await api.patch(`/api/concierge/${id}/status`, { status, ...(notes ? { staffNotes: notes } : {}) });
        load();
        if (detail?.id === id) setDetail(prev => prev ? { ...prev, status } : null);
    };

    const timeAgo = (dt: string) => {
        const diff = Date.now() - new Date(dt).getTime();
        const h = Math.floor(diff / 3600000);
        if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    };

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('conciergeRequests')}</h1>
                    <p className="page-subtitle">{t('conciergeSubtitle', 'Guest services, transfers, reservations and special requests')}</p>
                </div>
                <button className="btn-primary" onClick={() => setModal({ ...BLANK })}>+ {t('newRequest')}</button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
                {[
                    { label: t('pending'), key: "pending", color: "#f59e0b" },
                    { label: t('inProgress'), key: "in_progress", color: "#6366f1" },
                    { label: t('completed'), key: "completed", color: "#22c55e" },
                    { label: t('total'), key: "total", color: "#3b82f6" },
                ].map(s => (
                    <div key={s.key} style={{ background: "#fff", border: `1px solid #e5e7eb`, borderLeft: `4px solid ${s.color}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer" }}
                        onClick={() => setStatusFilter(s.key === "total" ? "" : s.key.toUpperCase())}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{s.label}</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{stats[s.key] ?? 0}</div>
                    </div>
                ))}
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {[
                    { value: "", label: t('all') },
                    { value: "PENDING", label: t('pending') },
                    { value: "IN_PROGRESS", label: t('inProgress') },
                    { value: "COMPLETED", label: t('completed') },
                    { value: "CANCELLED", label: t('cancel') },
                ].map(s => (
                    <button key={s.value} onClick={() => setStatusFilter(s.value)}
                        style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                            background: statusFilter === s.value ? "#0f172a" : "#fff",
                            color: statusFilter === s.value ? "#fff" : "#374151",
                            borderColor: statusFilter === s.value ? "#0f172a" : "#d1d5db" }}>
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Request cards */}
            {loading ? <div className="state-container"><div className="spinner" /></div> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
                    {requests.map(req => (
                        <div key={req.id} style={{
                            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, cursor: "pointer",
                            borderLeft: `4px solid ${STATUS_COLORS[req.status] ?? "#94a3b8"}`,
                        }} onClick={() => setDetail(req)}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: "1.25rem" }}>{TYPE_ICONS[req.type] ?? "📋"}</span>
                                    <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{TYPE_KEY[req.type] ? t(TYPE_KEY[req.type]) : req.type}</span>
                                </div>
                                <span style={{ background: STATUS_COLORS[req.status] + "20", color: STATUS_COLORS[req.status], border: `1px solid ${STATUS_COLORS[req.status]}40`, borderRadius: 6, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700 }}>
                                    {req.status.replace("_", " ")}
                                </span>
                            </div>
                            {req.guestName && <div style={{ fontSize: "0.8rem", color: "#374151", marginBottom: 4 }}>👤 {req.guestName}{req.roomNumber ? ` · ${t('room')} ${req.roomNumber}` : ""}</div>}
                            {req.description && <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{req.description}</div>}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{timeAgo(req.createdAt)}</span>
                                {req.assignedTo && <span style={{ fontSize: "0.72rem", background: "#f1f5f9", borderRadius: 6, padding: "2px 8px", color: "#374151" }}>→ {req.assignedTo}</span>}
                            </div>
                        </div>
                    ))}
                    {requests.length === 0 && (
                        <div style={{ gridColumn: "1/-1", padding: 40, textAlign: "center", color: "#94a3b8" }}>{t('noConciergeRequests')}</div>
                    )}
                </div>
            )}

            {/* Detail modal */}
            {detail && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
                    onClick={() => setDetail(null)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 520, maxHeight: "85vh", overflow: "auto" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                                {TYPE_ICONS[detail.type]} {TYPE_KEY[detail.type] ? t(TYPE_KEY[detail.type]) : detail.type}
                            </h2>
                            <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                            {[
                                [t('guest'), detail.guestName], [t('room'), detail.roomNumber], [t('status'), detail.status],
                                [t('assignedTo', 'Assigned To'), detail.assignedTo], [t('requestedFor', 'Requested For'), detail.requestedFor ? new Date(detail.requestedFor).toLocaleString() : null],
                                [t('created', 'Created'), new Date(detail.createdAt).toLocaleString()],
                            ].filter(([, v]) => v).map(([k, v]) => (
                                <div key={String(k)} style={{ display: "flex", gap: 12 }}>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", minWidth: 90, textTransform: "uppercase" }}>{k}</span>
                                    <span style={{ fontSize: "0.875rem" }}>{String(v)}</span>
                                </div>
                            ))}
                        </div>
                        {detail.description && <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: "0.875rem" }}>{detail.description}</div>}
                        {detail.staffNotes && <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: "0.875rem" }}><b>{t('staffNotes')}:</b> {detail.staffNotes}</div>}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {detail.status === "PENDING" && <button className="btn-primary" style={{ fontSize: "0.8rem", padding: "6px 12px" }} onClick={() => patchStatus(detail.id, "IN_PROGRESS")}>{t('startWork')}</button>}
                            {detail.status === "IN_PROGRESS" && <button className="btn-primary" style={{ fontSize: "0.8rem", padding: "6px 12px" }} onClick={() => patchStatus(detail.id, "COMPLETED")}>{t('doneTask')}</button>}
                            {detail.status !== "CANCELLED" && detail.status !== "COMPLETED" && <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px" }} onClick={() => patchStatus(detail.id, "CANCELLED")}>{t('cancel')}</button>}
                            <button className="btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 12px", marginLeft: "auto" }} onClick={() => { setModal({ ...detail }); setDetail(null); }}>{t('edit')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit modal */}
            {modal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 520, maxHeight: "90vh", overflow: "auto" }}>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 20 }}>{modal.id ? t('edit') : t('newRequest')} </h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div style={{ gridColumn: "1/-1" }}>
                                <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 4 }}>{t('requestType', 'Request Type')} *</label>
                                <select value={modal.type ?? "OTHER"} onChange={e => setModal(p => ({ ...p!, type: e.target.value }))}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem" }}>
                                    {Object.entries(TYPE_KEY).map(([k, labelKey]) => <option key={k} value={k}>{t(labelKey)}</option>)}
                                </select>
                            </div>
                            {([["guestName", t('guestName'), "text"], ["roomNumber", t('roomNumberLabel'), "number"], ["assignedTo", t('assignTo', 'Assign To'), "text"]] as [string, string, string][]).map(([f, l, inputType]) => (
                                <div key={f}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 4 }}>{l}</label>
                                    <input type={inputType} value={(modal as any)[f] ?? ""} onChange={e => setModal(p => ({ ...p!, [f]: inputType === "number" ? Number(e.target.value) : e.target.value }))}
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", boxSizing: "border-box" }} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 4 }}>{t('status')}</label>
                                <select value={modal.status ?? "PENDING"} onChange={e => setModal(p => ({ ...p!, status: e.target.value }))}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem" }}>
                                    {["PENDING","IN_PROGRESS","COMPLETED","CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div style={{ gridColumn: "1/-1" }}>
                                <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 4 }}>{t('description')}</label>
                                <textarea value={modal.description ?? ""} onChange={e => setModal(p => ({ ...p!, description: e.target.value }))} rows={3}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", boxSizing: "border-box", resize: "vertical" }} />
                            </div>
                            <div style={{ gridColumn: "1/-1" }}>
                                <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 4, color: "#92400e" }}>{t('staffNotes')}</label>
                                <textarea value={modal.staffNotes ?? ""} onChange={e => setModal(p => ({ ...p!, staffNotes: e.target.value }))} rows={2}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #fde047", borderRadius: 8, fontSize: "0.875rem", background: "#fefce8", boxSizing: "border-box", resize: "vertical" }} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? t('working') : t('save')}</button>
                            <button className="btn-secondary" onClick={() => setModal(null)}>{t('cancel')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
