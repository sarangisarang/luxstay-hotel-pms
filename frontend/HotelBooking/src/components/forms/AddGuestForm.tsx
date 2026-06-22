"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { User, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type GuestPayload = {
  firstName:      string;
  lastName:       string;
  email:          string;
  phone:          string;
  address:        string;
  country:        string;
  nationality:    string;
  passportNumber: string;
  birthDate:      string;
};

const EMPTY: GuestPayload = {
  firstName: "", lastName: "", email: "", phone: "",
  address: "", country: "", nationality: "", passportNumber: "", birthDate: "",
};

export default function AddGuestForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [form,    setForm]    = useState<GuestPayload>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set(field: keyof GuestPayload) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post("/api/guests", form);
      setSuccess(true);
      setTimeout(() => router.push("/guests"), 1400);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      setError(ax?.response?.data?.message ?? ax?.response?.data?.error ?? ax?.message ?? "Failed to add guest.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('addGuest')}</h1>
          <p className="page-subtitle">{t('addGuestSubtitle')}</p>
        </div>
        <Link href="/guests" className="btn btn-secondary">
          <ArrowLeft size={14} /> {t('backToGuests')}
        </Link>
      </div>

      <div className="form-card">
        <div className="form-header">
          <div className="avatar-sm"><User size={14} /></div>
          <div className="form-header-text">
            <p className="form-heading">{t('guestInformation')}</p>
            <p className="form-subheading">{t('allFieldsRequired')}</p>
          </div>
        </div>

        {success && (
          <div className="feedback-success">
            <CheckCircle size={15} /> {t('guestAddedSuccess')}
          </div>
        )}
        {error && (
          <div className="feedback-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="g-first">{t('firstName')}</label>
              <input id="g-first" className="form-input" type="text" placeholder="John"
                value={form.firstName} onChange={set("firstName")} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="g-last">{t('lastName')}</label>
              <input id="g-last" className="form-input" type="text" placeholder="Doe"
                value={form.lastName} onChange={set("lastName")} required />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="g-email">{t('emailAddress')}</label>
            <input id="g-email" className="form-input" type="email" placeholder="john@example.com"
              value={form.email} onChange={set("email")} required />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="g-phone">{t('phoneNumber')}</label>
              <input id="g-phone" className="form-input" type="tel" placeholder="+1 555 000 0000"
                value={form.phone} onChange={set("phone")} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="g-dob">{t('dateOfBirth')}</label>
              <input id="g-dob" className="form-input" type="date"
                value={form.birthDate} onChange={set("birthDate")} required />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="g-addr">{t('address')}</label>
            <input id="g-addr" className="form-input" type="text" placeholder="123 Main St, City"
              value={form.address} onChange={set("address")} />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="g-country">{t('country')}</label>
              <input id="g-country" className="form-input" type="text" placeholder="United States"
                value={form.country} onChange={set("country")} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="g-nationality">{t('nationality')}</label>
              <input id="g-nationality" className="form-input" type="text" placeholder="American"
                value={form.nationality} onChange={set("nationality")} />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="g-passport">{t('passportIdNumber')}</label>
            <input id="g-passport" className="form-input" type="text" placeholder="A1234567"
              value={form.passportNumber} onChange={set("passportNumber")} />
          </div>

          <button type="submit" className="form-button" disabled={loading || success}>
            {loading ? t('addingGuest') : t('addGuest')}
          </button>
        </form>
      </div>
    </div>
  );
}
