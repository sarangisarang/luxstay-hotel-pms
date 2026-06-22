"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { Tag, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type CreateServiceDTO = { name: string; description: string; price: string };

function normalizePriceInput(v: string): number {
  const n = parseFloat((v || "0").replace(",", "."));
  if (!Number.isFinite(n) || Number.isNaN(n)) return 0;
  return Math.max(0, n);
}

export default function AddService() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [price,       setPrice]       = useState<number>(0);
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && description.trim().length > 0 && price >= 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!canSubmit) { setError(t('allFieldsRequired')); return; }
    setLoading(true);
    try {
      const payload: CreateServiceDTO = {
        name: name.trim(),
        description: description.trim(),
        price: price.toFixed(2),
      };
      await api.post("/api/services", payload);
      setSuccess(true);
      setTimeout(() => router.push("/services"), 1400);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message ?? t('failedToAddService'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('addService')}</h1>
          <p className="page-subtitle">{t('addServiceSubtitle')}</p>
        </div>
        <Link href="/services" className="btn btn-secondary">
          <ArrowLeft size={14} /> {t('backToServices')}
        </Link>
      </div>

      <div className="form-card">
        <div className="form-header">
          <div className="avatar-sm"><Tag size={14} /></div>
          <div className="form-header-text">
            <p className="form-heading">{t('serviceDetails')}</p>
            <p className="form-subheading">{t('allFieldsRequired')}</p>
          </div>
        </div>

        {success && (
          <div className="feedback-success">
            <CheckCircle size={15} /> {t('serviceAddedSuccess')}
          </div>
        )}
        {error && (
          <div className="feedback-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-field">
            <label className="form-label" htmlFor="s-name">{t('serviceNameLabel')}</label>
            <input id="s-name" className="form-input" type="text" placeholder="e.g., Breakfast, Spa, Airport Transfer"
              value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="s-desc">{t('description')}</label>
            <textarea id="s-desc" className="form-textarea" rows={3} placeholder="Short description of this service…"
              value={description} onChange={e => setDescription(e.target.value)} required />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="s-price">{t('priceUsd')}</label>
            <input id="s-price" className="form-input" type="number" step="0.01" min="0" inputMode="decimal"
              placeholder="0.00" value={price} onChange={e => setPrice(normalizePriceInput(e.target.value))} required />
          </div>

          <button type="submit" className="form-button" disabled={!canSubmit || success}>
            {loading ? t('addingService') : t('addService')}
          </button>
        </form>
      </div>
    </div>
  );
}
