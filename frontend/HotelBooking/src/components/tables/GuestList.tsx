"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import { Search, UserPlus, Trash2, Eye, Download } from "lucide-react";
import AiInsightCard from "@/components/AiInsightCard";
import Paginator from "@/components/ui/Paginator";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

type Guest = {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  country?: string;
  nationality?: string;
  passportNumber?: string;
  birthDate: string;
};

function fmtDate(d?: string) {
  if (!d) return "—";
  const dd = new Date(d);
  return Number.isNaN(dd.valueOf())
    ? d
    : dd.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

const PAGE_SIZE = 20;

export default function GuestList() {
  const { t } = useTranslation();
  const router = useRouter();
  const [guests,        setGuests]        = useState<Guest[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [deleting,      setDeleting]      = useState<string | number | null>(null);
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/api/guests?page=${page}&size=${PAGE_SIZE}`)
      .then(r => {
        if (!alive) return;
        const d = r.data;
        setGuests(d?.content ?? (Array.isArray(d) ? d : []));
        setTotalPages(d?.totalPages ?? 1);
        setTotalElements(d?.totalElements ?? 0);
      })
      .catch(e => { if (alive) setError(e?.response?.data?.message ?? e.message ?? "Failed to load guests"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [page]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return guests;
    return guests.filter(g =>
      `${g.firstName} ${g.lastName} ${g.email} ${g.phone}`.toLowerCase().includes(q)
    );
  }, [guests, search]);

  async function handleDelete(id: string | number) {
    if (!confirm(t('deleteGuestConfirm'))) return;
    setDeleting(id);
    try {
      await api.delete(`/api/guests/${id}`);
      setGuests(prev => prev.filter(g => g.id !== id));
    } catch {
      alert("Failed to delete guest.");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return (
    <div className="state-container">
      <div className="spinner" />
      <p className="state-title">{t('loadingGuests')}</p>
    </div>
  );

  if (error) return (
    <div className="state-container">
      <div className="state-icon">⚠️</div>
      <p className="state-title">{t('couldNotLoadGuests')}</p>
      <p className="state-sub">{error}</p>
    </div>
  );

  return (
    <div className="fade-in">
      <AiInsightCard endpoint="/api/ai/insights/bookings" title={t('aiGuestIntelligence')} compact />
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('guests')}</h1>
          <p className="page-subtitle">{totalElements} {t('guests')}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-secondary"
            onClick={() => exportCsv(`guests-${new Date().toISOString().slice(0,10)}.csv`,
              filtered.map(g => ({ id: g.id, firstName: g.firstName, lastName: g.lastName, email: g.email, phone: g.phone || "" })))}>
            <Download size={14} /> {t('exportCsv')}
          </button>
          <Link href="/add-guest" className="btn btn-primary">
            <UserPlus size={15} />
            {t('addGuest')}
          </Link>
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{t('allGuests')}</span>
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input
              className="search-input"
              placeholder={t('searchGuests')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="state-container">
            <div className="state-icon">👥</div>
            <p className="state-title">{t('noGuests')}</p>
            <p className="state-sub">{search ? t('tryDifferentQuery') : ""}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('guest')}</th>
                  <th>{t('email')}</th>
                  <th>{t('phone')}</th>
                  <th>{t('address')}</th>
                  <th>{t('dateOfBirth')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, idx) => (
                  <tr key={g.id ?? idx}>
                    <td>
                      <div className="cell-with-avatar">
                        <div className="avatar-sm">{initials(g.firstName, g.lastName)}</div>
                        <span className="cell-name">{g.firstName} {g.lastName}</span>
                      </div>
                    </td>
                    <td className="cell-muted">{g.email || "—"}</td>
                    <td>{g.phone || "—"}</td>
                    <td className="cell-truncate cell-muted">{g.address || "—"}</td>
                    <td>{fmtDate(g.birthDate)}</td>
                    <td>
                      <div className="cell-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => router.push(`/guests/${g.id}`)}
                          title={t('viewDetails')}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={deleting === g.id}
                          onClick={() => handleDelete(g.id)}
                          title={t('deleteGuest')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginator
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          size={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
