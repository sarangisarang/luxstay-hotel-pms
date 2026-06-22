"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Voucher = {
    id: string;
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    usedCount: number;
    validFrom?: string;
    validTo?: string;
    active: boolean;
    minNights?: number;
    description?: string;
    createdAt?: string;
};

const EMPTY: Partial<Voucher> = {
    code: "", name: "", discountType: "PERCENTAGE", discountValue: 10,
    maxDiscountAmount: undefined, usageLimit: undefined, validFrom: "", validTo: "",
    active: true, minNights: undefined, description: "",
};

function fmtDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ active }: { active: boolean }) {
    const { t } = useTranslation();
    return (
        <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700,
            background: active ? "#f0fdf4" : "#fef2f2",
            color: active ? "#16a34a" : "#dc2626",
        }}>
            {active ? t('active') : t('inactive')}
        </span>
    );
}

function UsageBar({ used, limit }: { used: number; limit?: number }) {
    if (!limit) return <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>{used} used · Unlimited</span>;
    const pct = Math.min((used / limit) * 100, 100);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct >= 90 ? "#ef4444" : "#6366f1", borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>{used}/{limit}</span>
        </div>
    );
}

export default function VouchersPage() {
  const { t } = useTranslation();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing,  setEditing]  = useState<Voucher | null>(null);
    const [form,     setForm]     = useState<Partial<Voucher>>(EMPTY);
    const [saving,   setSaving]   = useState(false);
    const [testCode, setTestCode] = useState("");
    const [testResult, setTestResult] = useState<any>(null);
    const [search,   setSearch]   = useState("");
    const [filterActive, setFilterActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

    const load = () => {
        setLoading(true);
        api.get("/api/vouchers").then(r => setVouchers(r.data)).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

    const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
    const openEdit = (v: Voucher) => { setEditing(v); setForm(v); setShowForm(true); };

    const save = async () => {
        if (!form.code || !form.name || form.discountValue == null) {
            alert("Code, name and discount value are required.");
            return;
        }
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/api/vouchers/${editing.id}`, form);
            } else {
                await api.post("/api/vouchers", form);
            }
            setShowForm(false);
            load();
        } catch { alert("Save failed"); }
        finally { setSaving(false); }
    };

    const toggle = async (id: string) => {
        await api.patch(`/api/vouchers/${id}/toggle`);
        load();
    };

    const del = async (id: string) => {
        if (!confirm("Delete this voucher?")) return;
        await api.delete(`/api/vouchers/${id}`);
        load();
    };

    const testVoucher = async () => {
        if (!testCode) return;
        try {
            const r = await api.get(`/api/vouchers/validate?code=${encodeURIComponent(testCode)}&totalAmount=500&nights=3`);
            setTestResult(r.data);
        } catch { setTestResult({ valid: false, reason: "Request failed" }); }
    };

    const filtered = vouchers.filter(v => {
        const matchSearch = !search || `${v.code} ${v.name}`.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filterActive === "ALL" || (filterActive === "ACTIVE" ? v.active : !v.active);
        return matchSearch && matchFilter;
    });

    const activeCount   = vouchers.filter(v => v.active).length;
    const inactiveCount = vouchers.filter(v => !v.active).length;
    const totalUsage    = vouchers.reduce((s, v) => s + (v.usedCount ?? 0), 0);

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingVouchers')}</p></div>
    );

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('promoCodesVouchers')}</h1>
                    <p className="page-subtitle">{t('vouchersSubtitle')}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn-secondary" onClick={load}>↻ {t('refresh')}</button>
                    <button type="button" className="btn-primary" onClick={openNew}>+ {t('newVoucher')}</button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                    { label: t('activeVouchers'),   value: activeCount,   color: "#16a34a" },
                    { label: t('inactiveVouchers'), value: inactiveCount, color: "#dc2626" },
                    { label: t('totalUses'),         value: totalUsage,    color: "#6366f1" },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 20px", borderTop: `3px solid ${color}` }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Test voucher */}
            <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#374151", marginBottom: 10 }}>🧪 {t('testVoucherCode')}</div>
                <div style={{ display: "flex", gap: 8 }}>
                    <input value={testCode} onChange={e => setTestCode(e.target.value)} placeholder="Enter code to test…"
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }} />
                    <button type="button" onClick={testVoucher}
                        style={{ padding: "8px 18px", borderRadius: 8, background: "#6366f1", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
                        {t('validate')}
                    </button>
                </div>
                {testResult && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: testResult.valid ? "#f0fdf4" : "#fef2f2", border: `1px solid ${testResult.valid ? "#bbf7d0" : "#fecaca"}` }}>
                        {testResult.valid ? (
                            <div>
                                <div style={{ fontWeight: 700, color: "#16a34a" }}>✓ Valid — {testResult.name}</div>
                                <div style={{ fontSize: "0.85rem", color: "#374151", marginTop: 4 }}>
                                    Discount: {testResult.discountType === "PERCENTAGE" ? `${testResult.discountValue}%` : `€${testResult.discountValue}`} 
                                    {" "}= <strong>€{Number(testResult.discountAmount).toFixed(2)} off</strong> on €500 order (3 nights)
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: "#dc2626", fontWeight: 600 }}>✗ Invalid: {testResult.reason}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <input placeholder={t('searchCodes')} value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 200, padding: "8px 14px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }} />
                {(["ALL", "ACTIVE", "INACTIVE"] as const).map(f => (
                    <button key={f} type="button" onClick={() => setFilterActive(f)}
                        style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
                            background: filterActive === f ? "#6366f1" : "#fff", color: filterActive === f ? "#fff" : "#374151" }}>
                        {f}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="data-card" style={{ overflowX: "auto" }}>
                {filtered.length === 0 ? (
                    <div className="state-container"><p className="state-title">{t('noVouchersFound')}</p><p className="state-sub">{t('createFirstVoucher')}</p></div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc" }}>
                                {[t('code'), t('name'), t('discount'), t('validity'), t('usage'), t('minNights'), t('status'), t('actions')].map(h => (
                                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((v, i) => (
                                <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "12px 14px" }}>
                                        <code style={{ fontWeight: 800, color: "#4f46e5", background: "#eef2ff", padding: "3px 8px", borderRadius: 6, fontSize: "0.875rem" }}>{v.code}</code>
                                    </td>
                                    <td style={{ padding: "12px 14px", fontWeight: 500 }}>{v.name}</td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <span style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.95rem" }}>
                                            {v.discountType === "PERCENTAGE" ? `${v.discountValue}%` : `€${v.discountValue}`}
                                        </span>
                                        {v.discountType === "PERCENTAGE" && v.maxDiscountAmount && (
                                            <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: 6 }}>max €{v.maxDiscountAmount}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: "12px 14px", fontSize: "0.8rem" }}>
                                        {v.validFrom ? fmtDate(v.validFrom) : "—"} → {v.validTo ? fmtDate(v.validTo) : "∞"}
                                    </td>
                                    <td style={{ padding: "12px 14px", minWidth: 150 }}>
                                        <UsageBar used={v.usedCount ?? 0} limit={v.usageLimit} />
                                    </td>
                                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                        {v.minNights ? `${v.minNights}+` : "—"}
                                    </td>
                                    <td style={{ padding: "12px 14px" }}><StatusBadge active={v.active} /></td>
                                    <td style={{ padding: "12px 14px" }}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button type="button" onClick={() => openEdit(v)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#f8fafc", cursor: "pointer", fontSize: "0.78rem" }}>{t('edit')}</button>
                                            <button type="button" onClick={() => toggle(v.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: v.active ? "#fef2f2" : "#f0fdf4", color: v.active ? "#dc2626" : "#16a34a", cursor: "pointer", fontSize: "0.78rem" }}>
                                                {v.active ? t('disable') : t('enable')}
                                            </button>
                                            <button type="button" onClick={() => del(v.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: "0.78rem" }}>{t('delete')}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showForm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowForm(false)}>
                    <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "90%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 20, color: "#0f172a" }}>{editing ? t('editVoucher') : t('newPromoCode')}</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            {[
                                { label: "Code (e.g. SUMMER2026) *", key: "code", type: "text" },
                                { label: "Display Name *", key: "name", type: "text" },
                            ].map(({ label, key, type }) => (
                                <div key={key}>
                                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{label}</label>
                                    <input type={type} value={(form as any)[key] ?? ""} onChange={e => set(key, e.target.value)}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", boxSizing: "border-box", outline: "none", textTransform: key === "code" ? "uppercase" : "none" }} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('discountTypeLabel')} *</label>
                                <select value={form.discountType ?? "PERCENTAGE"} onChange={e => set("discountType", e.target.value)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }}>
                                    <option value="PERCENTAGE">Percentage (%)</option>
                                    <option value="FIXED">Fixed Amount (€)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>
                                    {t('discountValueLabel')} * {form.discountType === "PERCENTAGE" ? "(%)" : "(€)"}
                                </label>
                                <input type="number" step="0.01" min="0" value={form.discountValue ?? ""} onChange={e => set("discountValue", parseFloat(e.target.value))}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }} />
                            </div>
                            {form.discountType === "PERCENTAGE" && (
                                <div>
                                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('maxDiscount')}</label>
                                    <input type="number" step="0.01" min="0" value={form.maxDiscountAmount ?? ""} onChange={e => set("maxDiscountAmount", parseFloat(e.target.value) || undefined)}
                                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }} />
                                </div>
                            )}
                            <div>
                                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('validFrom')}</label>
                                <input type="date" value={form.validFrom ?? ""} onChange={e => set("validFrom", e.target.value || undefined)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('validTo')}</label>
                                <input type="date" value={form.validTo ?? ""} onChange={e => set("validTo", e.target.value || undefined)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('usageLimit')}</label>
                                <input type="number" min="1" value={form.usageLimit ?? ""} onChange={e => set("usageLimit", parseInt(e.target.value) || undefined)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('minStay')}</label>
                                <input type="number" min="1" value={form.minNights ?? ""} onChange={e => set("minNights", parseInt(e.target.value) || undefined)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }} />
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>{t('description')}</label>
                                <textarea rows={2} value={form.description ?? ""} onChange={e => set("description", e.target.value)}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.875rem", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input type="checkbox" id="activeChk" checked={!!form.active} onChange={e => set("active", e.target.checked)} style={{ width: 16, height: 16, accentColor: "#6366f1" }} />
                                <label htmlFor="activeChk" style={{ fontSize: "0.875rem", cursor: "pointer" }}>{t('activeCheckboxLabel')}</label>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
                            <button type="button" onClick={() => setShowForm(false)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8fafc", cursor: "pointer", fontWeight: 600 }}>{t('cancel')}</button>
                            <button type="button" onClick={save} disabled={saving} style={{ padding: "9px 24px", borderRadius: 8, background: "#6366f1", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
                                {saving ? t('savingDots') : editing ? t('update') : t('createVoucher')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
