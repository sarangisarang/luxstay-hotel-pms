"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface Service {
  id: string | number;
  name: string;
  description: string;
  price: number;
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function ServiceListPage() {
  const { t } = useTranslation();
  const [services, setServices] = useState<Service[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [search,   setSearch]   = useState("");
  const [deleting, setDeleting] = useState<string | number | null>(null);
  const [isAdmin,  setIsAdmin]  = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setIsAdmin(localStorage.getItem("role") === "ADMIN");
  }, []);

  useEffect(() => {
    let alive = true;
    api.get("/api/services")
      .then(r => { if (alive) setServices(Array.isArray(r.data) ? r.data : (r.data?.content ?? [])); })
      .catch(e => { if (alive) setError(e?.message ?? "Failed to load services"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? services.filter(s => `${s.name} ${s.description}`.toLowerCase().includes(q)) : services;
  }, [services, search]);

  async function handleDelete(id: string | number) {
    if (!confirm(t('deleteServiceConfirm'))) return;
    setDeleting(id);
    try {
      await api.delete(`/api/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
    } catch { alert("Failed to delete service."); }
    finally { setDeleting(null); }
  }

  if (loading) return <div className="state-container"><div className="spinner" /><p className="state-title">{t('loading')}</p></div>;
  if (error)   return <div className="state-container"><div className="state-icon">⚠️</div><p className="state-title">Error</p><p className="state-sub">{error}</p></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('services')}</h1>
          <p className="page-subtitle">{services.length} {t('servicesAvailable')}</p>
        </div>
        <div className="page-actions">
          {isAdmin && <Link href="/add-service" className="btn btn-primary"><Plus size={15} />{t('addService2')}</Link>}
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{t('allServices')}</span>
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder={t('searchServices')}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="state-container">
            <div className="state-icon">🛎️</div>
            <p className="state-title">{search ? t('noServicesMatch') : t('noServicesYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('serviceHeader')}</th>
                  <th>{t('description')}</th>
                  <th>{t('priceHeader')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id ?? i}>
                    <td className="cell-name">{s.name}</td>
                    <td className="cell-muted cell-truncate">{s.description || "—"}</td>
                    <td className="cell-mono">{fmtPrice(s.price)}</td>
                    <td>
                      <div className="cell-actions">
                        <Link href={`/services/${s.id}/edit`} className="btn btn-secondary btn-sm" title="Edit service">
                          <Pencil size={13} />
                        </Link>
                        <button type="button" className="btn btn-danger btn-sm" title="Delete service"
                          disabled={deleting === s.id} onClick={() => handleDelete(s.id)}>
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
