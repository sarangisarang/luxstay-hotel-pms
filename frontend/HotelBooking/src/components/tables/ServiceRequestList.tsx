"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { Search, Plus, Pencil, Trash2, Bell } from "lucide-react";
import AiInsightCard from "@/components/AiInsightCard";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type ServiceRequest = {
  id: string;
  guestId: string;
  serviceId: string;
  status: string;
  requestDate: string;
  description?: string;
};

type Guest   = { id: string; firstName: string; lastName: string };
type Service = { id: string; name: string };

const STATUS_CLASS: Record<string, string> = {
  PENDING:     "badge-warn",
  IN_PROGRESS: "badge-info",
  COMPLETED:   "badge-success",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function ServiceRequestList() {
  const { t } = useTranslation();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [guests,   setGuests]   = useState<Guest[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [r1, r2, r3] = await Promise.all([
          api.get("/api/servicerequests"),
          api.get("/api/guests"),
          api.get("/api/services"),
        ]);
        if (!alive) return;
        setRequests(Array.isArray(r1.data) ? r1.data : (r1.data?.content ?? []));
        setGuests(Array.isArray(r2.data)   ? r2.data : (r2.data?.content ?? []));
        setServices(Array.isArray(r3.data) ? r3.data : (r3.data?.content ?? []));
      } catch (e: unknown) {
        const err = e as { message?: string };
        if (alive) setError(err?.message ?? "Failed to load service requests.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const guestName  = (id: string) => { const g = guests.find(x => x.id === id); return g ? `${g.firstName} ${g.lastName}` : "—"; };
  const serviceName = (id: string) => services.find(x => x.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(r =>
      [guestName(r.guestId), serviceName(r.serviceId), r.status, r.description ?? ""].some(v =>
        v.toLowerCase().includes(q)
      )
    );
  }, [requests, guests, services, search]);

  async function handleDelete(id: string) {
    if (!confirm(t('deleteServiceRequestConfirm'))) return;
    setDeleting(id);
    try {
      await api.delete(`/api/servicerequests/${id}`);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch { alert("Failed to delete request."); }
    finally { setDeleting(null); }
  }

  if (loading) return (
    <div className="state-container">
      <div className="spinner" />
      <p className="state-title">{t('loadingServiceRequests')}</p>
    </div>
  );

  if (error) return (
    <div className="state-container">
      <div className="state-icon">⚠️</div>
      <p className="state-title">{t('error', 'Error')}</p>
      <p className="state-sub">{error}</p>
    </div>
  );

  return (
    <div className="fade-in">
      <AiInsightCard endpoint="/api/ai/insights/operations" title={t('aiServiceRequestAnalysis')} compact />
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('serviceRequests')}</h1>
          <p className="page-subtitle">{requests.length} {t('requests')}</p>
        </div>
        <div className="page-actions">
          <Link href="/add-service-request" className="btn btn-primary">
            <Plus size={15} /> {t('addRequest')}
          </Link>
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{t('allRequests')}</span>
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder={t('searchServiceRequests')}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="state-container">
            <div className="state-icon"><Bell size={28} /></div>
            <p className="state-title">{search ? t('noRequestsMatch') : t('noServiceRequestsYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('guest')}</th>
                  <th>{t('serviceLabel')}</th>
                  <th>{t('status')}</th>
                  <th>{t('requestDate')}</th>
                  <th>{t('description')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req.id}>
                    <td className="cell-name">{guestName(req.guestId)}</td>
                    <td>{serviceName(req.serviceId)}</td>
                    <td>
                      <span className={`badge ${STATUS_CLASS[req.status] ?? "badge-neutral"}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="cell-muted">{fmtDate(req.requestDate)}</td>
                    <td className="cell-muted cell-truncate">{req.description || "—"}</td>
                    <td>
                      <div className="cell-actions">
                        <button type="button" className="btn btn-secondary btn-sm"
                          onClick={() => router.push(`/edit-service-request/${req.id}`)}
                          title="Edit request">
                          <Pencil size={13} />
                        </button>
                        <button type="button" className="btn btn-danger btn-sm"
                          disabled={deleting === req.id}
                          onClick={() => handleDelete(req.id)}
                          title="Delete request">
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
      </div>
    </div>
  );
}
