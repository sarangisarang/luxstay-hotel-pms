"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { Bell, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type UUID = string;
type Guest   = { id: UUID; firstName?: string; lastName?: string; fullName?: string; email?: string };
type Service = { id: UUID; name: string; price?: number | string };
type Status  = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const d = data as Record<string, unknown>;
  if (d && Array.isArray(d.content)) return d.content as T[];
  return [];
}

function guestLabel(g: Guest) {
  const name = g.fullName || [g.firstName, g.lastName].filter(Boolean).join(" ").trim();
  return name || g.email || "(unknown)";
}

export default function AddServiceRequest() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();

  const [guests,   setGuests]   = useState<Guest[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [guestId,     setGuestId]     = useState(params.get("guestId")   ?? "");
  const [serviceId,   setServiceId]   = useState(params.get("serviceId") ?? "");
  const [status,      setStatus]      = useState<Status>("PENDING");
  const [description, setDescription] = useState("");
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 16));

  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [gRes, sRes] = await Promise.all([api.get("/api/guests"), api.get("/api/services")]);
        if (!alive) return;
        const sList = toArray<Service>(sRes.data);
        setGuests(toArray<Guest>(gRes.data));
        setServices(sList);
        if (serviceId && !sList.some(s => s.id === serviceId)) setServiceId("");
      } catch (e: unknown) {
        const err = e as { message?: string };
        if (alive) setError(err?.message ?? "Failed to load data.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const canSubmit = useMemo(() => !!guestId && !!serviceId && !!status && !submitting, [guestId, serviceId, status, submitting]);
  const preselectedGuestMissing = !!guestId && !guests.some(g => g.id === guestId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!guestId || !serviceId) { setError("Please select both guest and service."); return; }
    setSubmitting(true);
    try {
      await api.post("/api/servicerequests", {
        guestId,
        serviceId,
        status,
        requestDate: new Date(requestDate).toISOString(),
        description: description.trim() || null,
      });
      setSuccess(true);
      setTimeout(() => router.push("/service-requests"), 1400);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to create request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fade-in form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('addServiceRequest2')}</h1>
          <p className="page-subtitle">{t('addServiceRequestSubtitle')}</p>
        </div>
        <Link href="/service-requests" className="btn btn-secondary">
          <ArrowLeft size={14} /> {t('back')}
        </Link>
      </div>

      <div className="form-card">
        <div className="form-header">
          <div className="avatar-sm"><Bell size={14} /></div>
          <div className="form-header-text">
            <p className="form-heading">{t('requestDetails')}</p>
            <p className="form-subheading">{t('fieldsRequired')}</p>
          </div>
        </div>

        {loading && (
          <div className="state-container">
            <div className="spinner" />
            <p className="state-title">{t('loading')}</p>
          </div>
        )}

        {!loading && success && (
          <div className="feedback-success">
            <CheckCircle size={15} /> {t('serviceRequestCreated')}
          </div>
        )}
        {!loading && error && (
          <div className="feedback-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {!loading && (
          <form onSubmit={handleSubmit} className="form-body">
            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="sr-guest">{t('guest')} *</label>
                <select id="sr-guest" className="form-select" value={guestId} onChange={e => setGuestId(e.target.value)} required>
                  <option value="">{t('selectAGuest')}</option>
                  {preselectedGuestMissing && <option value={guestId}>(selected guest)</option>}
                  {guests.map(g => <option key={g.id} value={g.id}>{guestLabel(g)}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="sr-service">{t('serviceLabel')} *</label>
                <select id="sr-service" className="form-select" value={serviceId} onChange={e => setServiceId(e.target.value)} required>
                  <option value="">{t('selectAService')}</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.price != null ? ` — $${Number(s.price).toFixed(2)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="sr-status">Status *</label>
                <select id="sr-status" className="form-select" value={status} onChange={e => setStatus(e.target.value as Status)} required>
                  <option value="PENDING">{t('pending')}</option>
                  <option value="IN_PROGRESS">{t('inProgress')}</option>
                  <option value="COMPLETED">{t('completed')}</option>
                  <option value="CANCELLED">{t('cancelled')}</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="sr-date">{t('requestDate')} *</label>
                <input id="sr-date" className="form-input" type="datetime-local"
                  value={requestDate} onChange={e => setRequestDate(e.target.value)} required />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="sr-desc">{t('description')}</label>
              <textarea id="sr-desc" className="form-textarea" rows={3} placeholder="Additional details…"
                value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <button type="submit" className="form-button" disabled={!canSubmit || success}>
              {submitting ? t('creatingRequest') : t('createRequest')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
