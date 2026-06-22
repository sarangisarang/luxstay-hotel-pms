"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { Search, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type FeedbackReview = {
  id: string;
  guestId?: string;
  feedbackText?: string;
  rating?: number;
  createdAt?: string;
  hotelId?: string;
  hotelName?: string;
  guest_id?: string;
  feedback_text?: string;
  created_at?: string;
  hotel_id?: string;
  hotel_name?: string;
  comment?: string;
  date?: string;
};

type Guest = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  surname?: string;
  fullName?: string;
};

type Hotel = { id: string; name: string };

function normalizeList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const d = data as Record<string, unknown>;
  if (d && Array.isArray(d.content)) return d.content;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
}

function guestFullName(g: Guest): string {
  const fn = g.firstName ?? g.name ?? "";
  const ln = g.lastName ?? g.surname ?? "";
  const joined = `${fn} ${ln}`.trim();
  return joined || g.fullName || "—";
}

function fmtDate(v?: string): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit" }).format(d);
}

function clampRating(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}

function RatingBadge({ rating }: { rating: unknown }) {
  const r = clampRating(rating);
  const color = r >= 8 ? "badge-success" : r >= 5 ? "badge-info" : r >= 3 ? "badge-warn" : "badge-neutral";
  return (
    <div className="rating-cell">
      <span className={`badge ${color}`}>
        <Star size={10} /> {r}/10
      </span>
      <div className="rating-bar-track">
        <div className={`rating-bar-fill rating-w-${r}`} />
      </div>
    </div>
  );
}

export default function FeedbackReviewList() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<FeedbackReview[]>([]);
  const [guests,  setGuests]  = useState<Guest[]>([]);
  const [hotels,  setHotels]  = useState<Hotel[]>([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [r1, r2, r3] = await Promise.all([
          api.get("/api/feedback-reviews"),
          api.get("/api/guests", { params: { size: 2000 } }),
          api.get("/api/hotels"),
        ]);
        if (!alive) return;
        const list = normalizeList(r1.data) as FeedbackReview[];
        list.sort((a, b) => {
          const ad = a.createdAt ?? a.created_at ?? a.date ?? "";
          const bd = b.createdAt ?? b.created_at ?? b.date ?? "";
          return new Date(bd).getTime() - new Date(ad).getTime();
        });
        setReviews(list);
        setGuests(normalizeList(r2.data) as Guest[]);
        setHotels(normalizeList(r3.data) as Hotel[]);
      } catch (e: unknown) {
        if (!alive) return;
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        setError(err?.response?.data?.message ?? err?.message ?? "Failed to load reviews.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const guestMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of guests) m.set(g.id, guestFullName(g));
    return m;
  }, [guests]);

  const hotelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of hotels) m.set(h.id, h.name);
    return m;
  }, [hotels]);

  const rows = useMemo(() => {
    const mapped = reviews.map(r => {
      const guestId  = r.guestId  ?? r.guest_id  ?? "";
      const hotelId  = r.hotelId  ?? r.hotel_id  ?? "";
      return {
        id:        r.id,
        guestName: guestId ? (guestMap.get(guestId) ?? "—") : "—",
        hotelName: r.hotelName ?? r.hotel_name ?? (hotelId ? hotelMap.get(hotelId) : undefined) ?? "—",
        comment:   r.feedbackText ?? r.feedback_text ?? r.comment ?? "—",
        rating:    r.rating ?? 0,
        date:      r.createdAt ?? r.created_at ?? r.date ?? "",
      };
    });
    const q = search.trim().toLowerCase();
    if (!q) return mapped;
    return mapped.filter(x =>
      x.id.toLowerCase().includes(q) ||
      x.guestName.toLowerCase().includes(q) ||
      x.hotelName.toLowerCase().includes(q) ||
      x.comment.toLowerCase().includes(q)
    );
  }, [reviews, guestMap, hotelMap, search]);

  if (loading) return (
    <div className="state-container">
      <div className="spinner" />
      <p className="state-title">{t('loadingReviews')}</p>
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
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('feedbackReviews')}</h1>
          <p className="page-subtitle">{reviews.length} {t('totalReviews').toLowerCase()}</p>
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{t('allReviews')}</span>
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder={t('searchReview')}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="state-container">
            <div className="state-icon">⭐</div>
            <p className="state-title">{search ? t('noReviewsMatchSearch') : t('noReviewsYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('guest')}</th>
                  <th>{t('hotel')}</th>
                  <th>{t('comment')}</th>
                  <th>{t('rating')}</th>
                  <th>{t('date')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="cell-name">{r.guestName}</td>
                    <td className="cell-muted">{r.hotelName}</td>
                    <td>
                      <span className="cell-truncate cell-muted" title={r.comment}>
                        {r.comment}
                      </span>
                    </td>
                    <td><RatingBadge rating={r.rating} /></td>
                    <td className="cell-muted">{fmtDate(r.date)}</td>
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
