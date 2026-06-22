"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { Hotel, ArrowLeft, Star, Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type HotelDTO = {
  name: string;
  address: string;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  rating?: number | null;
};

const MAX_MB = 5;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function parseRating(s: string): number | null {
  const n = parseFloat(s.trim().replace(",", "."));
  if (!isFinite(n)) return null;
  return clamp(n, 0, 5);
}

function StarPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const v = typeof value === "number" ? clamp(value, 0, 5) : 0;
  return (
    <div className="star-picker">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" className={`star-btn${v >= i ? " star-btn-active" : ""}`}
          aria-label={`Set rating to ${i}`} onClick={() => onChange(i)}>
          <Star size={18} />
        </button>
      ))}
      {value !== null && (
        <button type="button" className="star-clear" onClick={() => onChange(null)}>Clear</button>
      )}
    </div>
  );
}

export default function AddHotel() {
  const { t } = useTranslation();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", address: "", city: "", country: "", phone: "", email: "", description: "", rating: "" });
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const payload: HotelDTO = useMemo(() => ({
    name:        form.name.trim(),
    address:     form.address.trim(),
    city:        form.city.trim()        || null,
    country:     form.country.trim()     || null,
    phone:       form.phone.trim()       || null,
    email:       form.email.trim()       || null,
    description: form.description.trim() || null,
    rating:      parseRating(form.rating),
  }), [form]);

  const emailOk   = !payload.email   || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email);
  const ratingOk  = payload.rating == null || (payload.rating >= 0 && payload.rating <= 5);
  const canSubmit = payload.name.length > 0 && payload.address.length > 0 && emailOk && ratingOk && !loading;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const typeOk = ACCEPTED.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!typeOk) { setError("Please choose a JPG, PNG or WebP image."); e.target.value = ""; return; }
    if (file.size / 1048576 > MAX_MB) { setError(`Image too large. Max ${MAX_MB} MB.`); e.target.value = ""; return; }
    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) { URL.revokeObjectURL(imagePreview); setImagePreview(null); }
  }

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await api.post("/api/hotels/save", payload, { headers: { "Content-Type": "application/json" } });
      const hotelId = res?.data?.id;
      if (!hotelId) throw new Error("Hotel ID was not returned from backend.");
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        fd.append("hotelId", hotelId);
        await api.post("/api/hotels/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setSuccess(true);
      setTimeout(() => router.push("/hotel"), 1400);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message ?? "Failed to add hotel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('addHotel')}</h1>
          <p className="page-subtitle">{t('addHotelSubtitle', 'Create a new hotel property')}</p>
        </div>
        <Link href="/hotel" className="btn btn-secondary">
          <ArrowLeft size={14} /> Back to Hotels
        </Link>
      </div>

      <div className="form-card">
        <div className="form-header">
          <div className="avatar-sm"><Hotel size={14} /></div>
          <div className="form-header-text">
            <p className="form-heading">Hotel Details</p>
            <p className="form-subheading">Name and Address are required</p>
          </div>
        </div>

        {success && (
          <div className="feedback-success">
            <CheckCircle size={15} /> Hotel added successfully! Redirecting…
          </div>
        )}
        {error && (
          <div className="feedback-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-field">
            <label className="form-label" htmlFor="h-name">Hotel Name *</label>
            <input id="h-name" name="name" className="form-input" type="text" placeholder="e.g., Grand Plaza Hotel"
              value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="h-addr">Address *</label>
            <input id="h-addr" name="address" className="form-input" type="text" placeholder="Street address"
              value={form.address} onChange={handleChange} required />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="h-country">Country</label>
              <input id="h-country" name="country" className="form-input" type="text" placeholder="e.g. Georgia"
                value={form.country} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="h-city">City</label>
              <input id="h-city" name="city" className="form-input" type="text" placeholder="e.g. Tbilisi"
                value={form.city} onChange={handleChange} />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="h-phone">{t('phone')}</label>
              <input id="h-phone" name="phone" className="form-input" type="tel" placeholder="+1 555 000 0000"
                value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="h-email">{t('email')}</label>
              <input id="h-email" name="email" className={`form-input${emailOk ? "" : " form-input-error"}`}
                type="email" placeholder="info@hotel.com"
                value={form.email} onChange={handleChange} />
              {!emailOk && <p className="form-hint-error">Please enter a valid email address.</p>}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="h-desc">{t('description')}</label>
            <textarea id="h-desc" name="description" className="form-textarea" rows={3}
              placeholder="Short description of the hotel…"
              value={form.description} onChange={handleChange} />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="h-rating">Rating (0–5)</label>
              <StarPicker value={payload.rating ?? null} onChange={v => setForm(p => ({ ...p, rating: v === null ? "" : String(v) }))} />
              <input id="h-rating" name="rating" className="form-input" type="number" min={0} max={5} step="0.5"
                placeholder="e.g. 4.5" value={form.rating} onChange={handleChange} />
              {!ratingOk && <p className="form-hint-error">Rating must be between 0 and 5.</p>}
            </div>

            <div className="form-field">
              <label className="form-label">Photo (max {MAX_MB} MB)</label>
              <div className="upload-zone">
                <label className="upload-label" htmlFor="h-img">
                  <Upload size={16} />
                  {imageFile ? imageFile.name : "Choose image…"}
                </label>
                <input id="h-img" type="file" accept=".jpg,.jpeg,.png,.webp" className="upload-input"
                  onChange={handleImageChange} />
                {imagePreview && (
                  <div className="upload-preview">
                    <img src={imagePreview} alt="Preview" className="upload-preview-img" />
                    <button type="button" className="btn btn-secondary btn-sm upload-clear" onClick={clearImage} title="Remove image">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button type="submit" className="form-button" disabled={!canSubmit || success}>
            {loading ? "Saving hotel…" : "Save Hotel"}
          </button>
        </form>
      </div>
    </div>
  );
}
