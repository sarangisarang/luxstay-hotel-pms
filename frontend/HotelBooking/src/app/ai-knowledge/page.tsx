"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, Brain } from "lucide-react";
import styles from "./KnowledgePage.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type KnowledgeEntry = {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string;
  active: boolean;
  priority: number;
};

type AiStats = {
  totalCalls: number;
  claudeCalls: number;
  ragCalls: number;
  handoffs: number;
  avgLatencyMs: number | null;
};

const CATEGORIES = ["FAQ", "POLICY", "ROOM_INFO", "PROCEDURE", "PROMOTION"];

const CAT_COLOR: Record<string, string> = {
  FAQ:       "#4f46e5",
  POLICY:    "#0891b2",
  ROOM_INFO: "#16a34a",
  PROCEDURE: "#d97706",
  PROMOTION: "#dc2626",
};

const CAT_CLS: Record<string, string> = {
  FAQ:       styles.catFaq,
  POLICY:    styles.catPolicy,
  ROOM_INFO: styles.catRoomInfo,
  PROCEDURE: styles.catProcedure,
  PROMOTION: styles.catPromotion,
};

const EMPTY: Omit<KnowledgeEntry, "id"> = {
  category: "FAQ", title: "", content: "", tags: "", active: true, priority: 0,
};

export default function AiKnowledgePage() {
  const { t } = useTranslation();
  const [entries, setEntries]   = useState<KnowledgeEntry[]>([]);
  const [stats, setStats]       = useState<AiStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
  const [editEntry, setEditEntry] = useState<Partial<KnowledgeEntry> | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [kbRes, statsRes] = await Promise.all([
        api.get("/api/knowledge"),
        api.get("/api/ai/monitor/stats").catch(() => ({ data: null })),
      ]);
      setEntries(kbRes.data);
      setStats(statsRes.data);
    } catch {
      setError("Failed to load knowledge base.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = entries.filter(e =>
    !query ||
    e.title.toLowerCase().includes(query.toLowerCase()) ||
    e.content.toLowerCase().includes(query.toLowerCase()) ||
    (e.tags ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const save = async () => {
    if (!editEntry?.title?.trim() || !editEntry?.content?.trim()) return;
    setSaving(true);
    try {
      if (editEntry.id) {
        await api.put(`/api/knowledge/${editEntry.id}`, editEntry);
      } else {
        await api.post("/api/knowledge", editEntry);
      }
      setEditEntry(null);
      await load();
    } catch {
      setError("Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this knowledge entry?")) return;
    await api.delete(`/api/knowledge/${id}`);
    await load();
  };

  const toggle = async (id: string) => {
    await api.patch(`/api/knowledge/${id}/toggle`);
    await load();
  };

  if (loading) return <div className={styles.loading}>{t('loadingKnowledge', 'Loading knowledge base…')}</div>;

  return (
    <div className={styles.page}>
      {/* Stats bar */}
      {stats && (
        <div className={styles.statsBar}>
          <StatChip label="Total AI Calls"   value={stats.totalCalls} />
          <StatChip label="Claude Calls"     value={stats.claudeCalls} />
          <StatChip label="RAG-enhanced"     value={stats.ragCalls} />
          <StatChip label="Human Handoffs"   value={stats.handoffs} />
          <StatChip label="Avg Latency"      value={stats.avgLatencyMs ? `${Math.round(stats.avgLatencyMs)}ms` : "—"} />
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Brain size={24} color="#4f46e5" />
          <div>
            <h1 className={styles.title}>AI Knowledge Base</h1>
            <p className={styles.subtitle}>{entries.length} entries · {entries.filter(e => e.active).length} active</p>
          </div>
        </div>
        <button className={styles.addBtn} onClick={() => setEditEntry({ ...EMPTY })}>
          <Plus size={15} /> Add Entry
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Search */}
      <div className={styles.searchWrap}>
        <Search size={15} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Search knowledge base…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('categoryLabel', 'Category')}</th>
              <th>{t('titleLabel', 'Title')}</th>
              <th>{t('tagsLabel', 'Tags')}</th>
              <th>{t('priorityLabel', 'Priority')}</th>
              <th>{t('status')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className={styles.empty}>{t('noEntriesFound', 'No entries found.')}</td></tr>
            )}
            {filtered.map(e => (
              <tr key={e.id} className={!e.active ? styles.inactive : ""}>
                <td>
                  <span className={`${styles.catBadge} ${CAT_CLS[e.category] ?? styles.catDefault}`}>
                    {e.category}
                  </span>
                </td>
                <td>
                  <div className={styles.entryTitle}>{e.title}</div>
                  <div className={styles.entryPreview}>{e.content.slice(0, 80)}{e.content.length > 80 ? "…" : ""}</div>
                </td>
                <td className={styles.tags}>{e.tags || "—"}</td>
                <td className={styles.center}>{e.priority}</td>
                <td className={styles.center}>
                  <span className={e.active ? styles.activeChip : styles.inactiveChip}>
                    {e.active ? "Active" : "Off"}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button onClick={() => setEditEntry({ ...e })} className={styles.iconBtn} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => toggle(e.id)} className={styles.iconBtn} title="Toggle">
                      {e.active ? <ToggleRight size={16} color="#16a34a" /> : <ToggleLeft size={16} color="#94a3b8" />}
                    </button>
                    <button onClick={() => remove(e.id)} className={styles.iconBtnDanger} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editEntry && (
        <div className={styles.overlay} onClick={() => setEditEntry(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {editEntry.id ? t('editEntry') : t('addKnowledgeEntry')}
            </h2>

            <div className={styles.formGrid}>
              <label className={styles.label}>Category</label>
              <select className={styles.select}
                value={editEntry.category ?? "FAQ"}
                onChange={e => setEditEntry(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>

              <label className={styles.label}>Title *</label>
              <input className={styles.input}
                placeholder="e.g. Check-in policy"
                value={editEntry.title ?? ""}
                onChange={e => setEditEntry(p => ({ ...p, title: e.target.value }))} />

              <label className={styles.label}>Content *</label>
              <textarea className={styles.textarea}
                placeholder="Full answer that will be injected into the AI context…"
                value={editEntry.content ?? ""}
                rows={5}
                onChange={e => setEditEntry(p => ({ ...p, content: e.target.value }))} />

              <label className={styles.label}>Tags</label>
              <input className={styles.input}
                placeholder="e.g. check-in, arrival, early"
                value={editEntry.tags ?? ""}
                onChange={e => setEditEntry(p => ({ ...p, tags: e.target.value }))} />

              <label className={styles.label}>Priority</label>
              <input className={styles.input} type="number"
                value={editEntry.priority ?? 0}
                onChange={e => setEditEntry(p => ({ ...p, priority: Number(e.target.value) }))} />

              <label className={styles.label}>{t('active')}</label>
              <input type="checkbox"
                checked={editEntry.active ?? true}
                onChange={e => setEditEntry(p => ({ ...p, active: e.target.checked }))} />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEditEntry(null)}>{t('cancel')}</button>
              <button className={styles.saveBtn} onClick={save} disabled={saving}>
                {saving ? t('savingDots') : t('saveEntry')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statChip}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
