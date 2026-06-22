"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type CorporateAccount = {
    id: string;
    companyName: string;
    industry?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    country?: string;
    vatNumber?: string;
    contractNumber?: string;
    negotiatedRate?: number;
    currency?: string;
    discountPercent?: number;
    creditLimit?: number;
    outstandingBalance?: number;
    status: string;
    billingCycle?: string;
    contractStart?: string;
    contractEnd?: string;
    notes?: string;
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "#22c55e",
    SUSPENDED: "#f59e0b",
    BLACKLISTED: "#ef4444",
    PROSPECT: "#6366f1",
    EXPIRED: "#94a3b8",
};

const BLANK: Partial<CorporateAccount> = { status: "ACTIVE", billingCycle: "MONTHLY", currency: "EUR" };

export default function CorporatePage() {
  const { t } = useTranslation();
    const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<Partial<CorporateAccount> | null>(null);
    const [detail, setDetail] = useState<CorporateAccount | null>(null);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get("/api/corporate"),
            api.get("/api/corporate/stats"),
        ]).then(([a, s]) => { setAccounts(a.data); setStats(s.data); })
          .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const filtered = accounts.filter(a => {
        const matchSearch = !search || a.companyName.toLowerCase().includes(search.toLowerCase())
            || (a.contactName ?? "").toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || a.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const save = async () => {
        if (!modal) return;
        setSaving(true);
        try {
            if (modal.id) await api.put(`/api/corporate/${modal.id}`, modal);
            else await api.post("/api/corporate", modal);
            setModal(null);
            load();
        } finally { setSaving(false); }
    };

    const deleteAccount = async (id: string) => {
        if (!confirm("Delete this corporate account?")) return;
        await api.delete(`/api/corporate/${id}`);
        setDetail(null);
        load();
    };

    const changeStatus = async (id: string, status: string) => {
        await api.patch(`/api/corporate/${id}/status`, { status });
        load();
        if (detail?.id === id) setDetail(prev => prev ? { ...prev, status } : null);
    };

    const fmt = (n?: number) => n != null ? `€${n.toLocaleString("en-EU", { maximumFractionDigits: 2 })}` : "—";

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('corporateAccounts', 'Corporate Accounts')}</h1>
                    <p className="page-subtitle">{t('corporateSubtitle', 'Manage corporate clients, negotiated rates and billing')}</p>
                </div>
                <button className="btn-primary" onClick={() => setModal({ ...BLANK })}>+ {t('newAccount', 'New Account')}</button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
                {[
                    { label: "Total", key: "total", color: "#6366f1" },
                    { label: "Active", key: "active", color: "#22c55e" },
                    { label: "Prospect", key: "prospect", color: "#3b82f6" },
                    { label: "Suspended", key: "suspended", color: "#f59e0b" },
                    { label: "Blacklisted", key: "blacklisted", color: "#ef4444" },
                ].map(s => (
                    <div key={s.key} style={{ background: "#fff", border: `1px solid #e5e7eb`, borderLeft: `4px solid ${s.color}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer" }}
                        onClick={() => setStatusFilter(s.key === "total" ? "" : s.key.toUpperCase())}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{s.label}</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{stats[s.key] ?? 0}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input placeholder="Search by company or contact…" value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem" }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem" }}>
                    <option value="">{t('allStatuses', 'All Statuses')}</option>
                    {["ACTIVE","PROSPECT","SUSPENDED","BLACKLISTED","EXPIRED"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            {loading ? <div className="state-container"><div className="spinner" /></div> : (
                <div className="data-card" style={{ overflow: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                                {["Company", "Contact", "Country", "Negotiated Rate", "Credit Limit", "Outstanding", "Status", ""].map(h => (
                                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((a, i) => (
                                <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}
                                    onClick={() => setDetail(a)}>
                                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{a.companyName}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem", color: "#374151" }}>{a.contactName ?? "—"}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>{a.country ?? "—"}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>{fmt(a.negotiatedRate)}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem" }}>{fmt(a.creditLimit)}</td>
                                    <td style={{ padding: "10px 14px", fontSize: "0.875rem", color: (a.outstandingBalance ?? 0) > 0 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>{fmt(a.outstandingBalance)}</td>
                                    <td style={{ padding: "10px 14px" }}>
                                        <span style={{ background: STATUS_COLORS[a.status] + "20", color: STATUS_COLORS[a.status], border: `1px solid ${STATUS_COLORS[a.status]}40`, borderRadius: 6, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 600 }}>
                                            {a.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: "10px 14px" }}>
                                        <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                                            onClick={e => { e.stopPropagation(); setModal({ ...a }); }}>{t('edit')}</button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>{t('noCorporateAccountsFound', 'No corporate accounts found')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail panel */}
            {detail && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
                    onClick={() => setDetail(null)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 580, maxHeight: "85vh", overflow: "auto" }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{detail.companyName}</h2>
                            <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {[
                                ["Industry", detail.industry], ["Contact", detail.contactName],
                                ["Email", detail.contactEmail], ["Phone", detail.contactPhone],
                                ["Country", detail.country], ["City", detail.city],
                                ["VAT Number", detail.vatNumber], ["Contract #", detail.contractNumber],
                                ["Negotiated Rate", fmt(detail.negotiatedRate)], ["Discount", detail.discountPercent ? `${detail.discountPercent}%` : "—"],
                                ["Credit Limit", fmt(detail.creditLimit)], ["Outstanding", fmt(detail.outstandingBalance)],
                                ["Billing Cycle", detail.billingCycle], ["Currency", detail.currency],
                            ].map(([k, v]) => (
                                <div key={String(k)} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
                                    <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{v ?? "—"}</div>
                                </div>
                            ))}
                        </div>
                        {detail.notes && (
                            <div style={{ marginTop: 16, background: "#fefce8", border: "1px solid #fde047", borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#78350f", marginBottom: 4 }}>{t('notesLabel', 'NOTES')}</div>
                                <div style={{ fontSize: "0.875rem" }}>{detail.notes}</div>
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                            <button className="btn-primary" onClick={() => { setModal({ ...detail }); setDetail(null); }}>{t('edit')}</button>
                            {detail.status !== "ACTIVE" && <button className="btn-secondary" onClick={() => changeStatus(detail.id, "ACTIVE")}>{t('activate', 'Activate')}</button>}
                            {detail.status === "ACTIVE" && <button className="btn-secondary" onClick={() => changeStatus(detail.id, "SUSPENDED")}>{t('suspend', 'Suspend')}</button>}
                            <button style={{ marginLeft: "auto", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}
                                onClick={() => deleteAccount(detail.id)}>{t('delete')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit modal */}
            {modal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 640, maxHeight: "90vh", overflow: "auto" }}>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 20 }}>{modal.id ? "Edit" : "New"} Corporate Account</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {[
                                ["companyName", "Company Name *", "text"],
                                ["industry", "Industry", "text"],
                                ["contactName", "Contact Name", "text"],
                                ["contactEmail", "Contact Email", "email"],
                                ["contactPhone", "Contact Phone", "text"],
                                ["address", "Address", "text"],
                                ["city", "City", "text"],
                                ["country", "Country", "text"],
                                ["vatNumber", "VAT Number", "text"],
                                ["contractNumber", "Contract Number", "text"],
                                ["negotiatedRate", "Negotiated Rate (€/night)", "number"],
                                ["discountPercent", "Discount %", "number"],
                                ["creditLimit", "Credit Limit (€)", "number"],
                            ].map(([field, label, type]) => (
                                <div key={field}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{label}</label>
                                    <input type={type} value={(modal as any)[field] ?? ""}
                                        onChange={e => setModal(p => ({ ...p!, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", boxSizing: "border-box" }} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{t('status')}</label>
                                <select value={modal.status ?? "ACTIVE"} onChange={e => setModal(p => ({ ...p!, status: e.target.value }))}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem" }}>
                                    {["ACTIVE","PROSPECT","SUSPENDED","BLACKLISTED","EXPIRED"].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{t('billingCycle', 'Billing Cycle')}</label>
                                <select value={modal.billingCycle ?? "MONTHLY"} onChange={e => setModal(p => ({ ...p!, billingCycle: e.target.value }))}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem" }}>
                                    {["PER_BOOKING","WEEKLY","MONTHLY","QUARTERLY"].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>{t('notes')}</label>
                            <textarea value={modal.notes ?? ""} onChange={e => setModal(p => ({ ...p!, notes: e.target.value }))} rows={3}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.875rem", boxSizing: "border-box", resize: "vertical" }} />
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? t('saving', 'Saving…') : t('save', 'Save')}</button>
                            <button className="btn-secondary" onClick={() => setModal(null)}>{t('cancel')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
