"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/Inventory.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Item = {
    id: string; name: string; category: string;
    unitCost: number; currentStock: number; minStock: number;
    active: boolean;
};
type Movement = {
    id: string; itemId: string; itemName: string;
    quantity: number; direction: string; staffName: string;
    note: string; createdAt: string;
};
type Summary = { totalItems: number; lowStockCount: number; totalStockValue: number };

const CATEGORIES = ["MINIBAR", "AMENITY", "LINEN", "CLEANING", "SUPPLIES", "OTHER"];

function fmt(n: number) {
    return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n ?? 0);
}

export default function InventoryPage() {
  const { t } = useTranslation();
    const [items,    setItems]    = useState<Item[]>([]);
    const [movements,setMovements]= useState<Movement[]>([]);
    const [summary,  setSummary]  = useState<Summary | null>(null);
    const [loading,  setLoading]  = useState(true);

    // New item form
    const [showAdd,  setShowAdd]  = useState(false);
    const [newName,  setNewName]  = useState("");
    const [newCat,   setNewCat]   = useState("MINIBAR");
    const [newCost,  setNewCost]  = useState("");
    const [newMin,   setNewMin]   = useState("5");
    const [newStock, setNewStock] = useState("0");

    // Adjust modal
    const [adjustItem,   setAdjustItem]   = useState<Item | null>(null);
    const [adjQty,       setAdjQty]       = useState("1");
    const [adjDir,       setAdjDir]       = useState("OUT");
    const [adjNote,      setAdjNote]      = useState("");

    function load() {
        Promise.all([
            api.get("/api/inventory"),
            api.get("/api/inventory/movements"),
            api.get("/api/inventory/summary"),
        ]).then(([ir, mr, sr]) => {
            setItems(Array.isArray(ir.data) ? ir.data : []);
            setMovements(Array.isArray(mr.data) ? mr.data : []);
            setSummary(sr.data);
        }).finally(() => setLoading(false));
    }

    useEffect(() => { load(); }, []);

    async function addItem(e: React.FormEvent) {
        e.preventDefault();
        await api.post("/api/inventory", {
            name: newName, category: newCat,
            unitCost: parseFloat(newCost),
            minStock: parseInt(newMin),
            currentStock: parseInt(newStock),
        });
        setShowAdd(false); setNewName(""); setNewCost(""); setNewMin("5"); setNewStock("0");
        load();
    }

    async function adjustStock(e: React.FormEvent) {
        e.preventDefault();
        if (!adjustItem) return;
        await api.post(`/api/inventory/${adjustItem.id}/adjust`, {
            quantity: parseInt(adjQty), direction: adjDir, note: adjNote,
        });
        setAdjustItem(null); setAdjQty("1"); setAdjNote(""); setAdjDir("OUT");
        load();
    }

    async function deactivate(id: string) {
        await api.delete(`/api/inventory/${id}`);
        load();
    }

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingInventory')}</p></div>
    );

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('inventoryMinibar')}</h1>
                    <p className="page-subtitle">{t('inventorySubtitle')}</p>
                </div>
                <button type="button" className="btn-primary" onClick={() => setShowAdd(v => !v)}>
                    {showAdd ? t('cancel') : `+ ${t('addItem')}`}
                </button>
            </div>

            {/* KPI row */}
            {summary && (
                <div className={s.kpiRow}>
                    <KpiCard label={t('totalItems')}      value={String(summary.totalItems)}    accent="#6366f1" />
                    <KpiCard label={t('lowStockAlerts')}  value={String(summary.lowStockCount)} accent="#ef4444" />
                    <KpiCard label={t('stockValue')}      value={fmt(summary.totalStockValue)}  accent="#22c55e" />
                </div>
            )}

            {/* Add form */}
            {showAdd && (
                <div className={`data-card ${s.mb24}`}>
                    <form onSubmit={addItem} className={s.addForm}>
                        <div className={`${s.formGroup} ${s.fgWide}`}>
                            <label className={s.formLabel} htmlFor="inv-name">{t('name')}</label>
                            <input id="inv-name" className={s.formInput} value={newName}
                                onChange={e => setNewName(e.target.value)} required placeholder="e.g. Sparkling Water" />
                        </div>
                        <div className={`${s.formGroup} ${s.fgMed}`}>
                            <label className={s.formLabel} htmlFor="inv-cat">{t('category')}</label>
                            <select id="inv-cat" className={s.formSelect} value={newCat} onChange={e => setNewCat(e.target.value)}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className={`${s.formGroup} ${s.fgSm}`}>
                            <label className={s.formLabel} htmlFor="inv-cost">{t('unitCost')} (€)</label>
                            <input id="inv-cost" className={s.formInput} type="number" step="0.01" min="0"
                                value={newCost} onChange={e => setNewCost(e.target.value)} required />
                        </div>
                        <div className={`${s.formGroup} ${s.fgXs}`}>
                            <label className={s.formLabel} htmlFor="inv-stock">{t('initialStock')}</label>
                            <input id="inv-stock" className={s.formInput} type="number" min="0"
                                value={newStock} onChange={e => setNewStock(e.target.value)} required />
                        </div>
                        <div className={`${s.formGroup} ${s.fgXs}`}>
                            <label className={s.formLabel} htmlFor="inv-min">{t('minStock')}</label>
                            <input id="inv-min" className={s.formInput} type="number" min="0"
                                value={newMin} onChange={e => setNewMin(e.target.value)} required />
                        </div>
                        <div className={`${s.formGroup} ${s.fgAuto}`}>
                            <button type="submit" className="btn-primary">{t('add')}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Items table */}
            <div className="data-card">
                <div className="data-card-header">
                    <span className="data-card-title">{t('stockItems')}</span>
                </div>
                <div className={s.tableScroll}>
                    <table className="ui-table">
                        <thead>
                            <tr>
                                <th>{t('name')}</th><th>{t('category')}</th><th>{t('unitCost')}</th>
                                <th>{t('inStock')}</th><th>{t('minLevel')}</th><th>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id}>
                                    <td className="cell-name">{item.name}</td>
                                    <td><span className={s.catPill}>{item.category}</span></td>
                                    <td className="cell-mono">{fmt(item.unitCost)}</td>
                                    <td className={item.currentStock <= item.minStock ? s.lowStock : s.stockOk}>
                                        {item.currentStock}
                                        {item.currentStock <= item.minStock && " ⚠"}
                                    </td>
                                    <td className="cell-muted">{item.minStock}</td>
                                    <td>
                                        <div className="cell-actions">
                                            <button type="button" className="btn-sm btn-outline"
                                                onClick={() => { setAdjustItem(item); setAdjDir("OUT"); }}>
                                                {t('adjust')}
                                            </button>
                                            <button type="button" className="btn-sm btn-danger"
                                                onClick={() => deactivate(item.id)}>
                                                {t('remove')}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr><td colSpan={6} className={`cell-muted ${s.emptyCell}`}>{t('noItemsYet')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent movements */}
            <div className={`data-card ${s.mt24}`}>
                <div className="data-card-header">
                    <span className="data-card-title">{t('recentMovements')}</span>
                </div>
                <div className={s.tableScroll}>
                    <table className="ui-table">
                        <thead>
                            <tr><th>{t('item')}</th><th>{t('direction')}</th><th>{t('qty')}</th><th>{t('staff')}</th><th>{t('note')}</th><th>{t('date')}</th></tr>
                        </thead>
                        <tbody>
                            {movements.slice(0, 30).map(m => (
                                <tr key={m.id}>
                                    <td>{m.itemName}</td>
                                    <td><span className={m.direction === "IN" ? s.dirIn : s.dirOut}>{m.direction}</span></td>
                                    <td>{m.quantity}</td>
                                    <td className="cell-muted">{m.staffName || "—"}</td>
                                    <td className="cell-muted">{m.note || "—"}</td>
                                    <td className="cell-muted">{new Date(m.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                            {movements.length === 0 && (
                                <tr><td colSpan={6} className={`cell-muted ${s.emptyCell}`}>{t('noMovementsYet')}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Adjust modal */}
            {adjustItem && (
                <div className={s.adjustModal} role="dialog" aria-modal="true">
                    <div className={s.adjustCard}>
                        <p className={s.adjustTitle}>{t('adjustStock')} — {adjustItem.name}</p>
                        <form onSubmit={adjustStock}>
                            <div className={s.formGroup}>
                                <label className={s.formLabel} htmlFor="adj-dir">{t('direction')}</label>
                                <select id="adj-dir" className={s.formSelect} value={adjDir} onChange={e => setAdjDir(e.target.value)}>
                                    <option value="OUT">{t('outConsumeGuest')}</option>
                                    <option value="IN">{t('inRestock')}</option>
                                </select>
                            </div>
                            <div className={s.formGroup}>
                                <label className={s.formLabel} htmlFor="adj-qty">{t('quantity')}</label>
                                <input id="adj-qty" className={s.formInput} type="number" min="1"
                                    value={adjQty} onChange={e => setAdjQty(e.target.value)} required />
                            </div>
                            <div className={s.formGroup}>
                                <label className={s.formLabel} htmlFor="adj-note">{t('noteOptional')}</label>
                                <input id="adj-note" className={s.formInput} value={adjNote}
                                    onChange={e => setAdjNote(e.target.value)} placeholder="Room 204, checkout…" />
                            </div>
                            <div className={s.adjustActions}>
                                <button type="button" className="btn-outline" onClick={() => setAdjustItem(null)}>{t('cancel')}</button>
                                <button type="submit" className="btn-primary">{t('confirm')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
    const accentVar = { "--kpi-accent": accent } as React.CSSProperties;
    return (
        <div className={s.kpiCard} style={accentVar}>
            <div className={s.kpiLabel}>{label}</div>
            <div className={s.kpiValue}>{value}</div>
        </div>
    );
}
