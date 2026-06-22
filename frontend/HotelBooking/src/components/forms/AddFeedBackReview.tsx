"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { MessageSquare, ArrowLeft, Star, AlertCircle, X } from "lucide-react";
import styles from "@/styles/FeedbackReview.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Guest = {
  id: string;
  firstName?: string; lastName?: string; name?: string;
  surname?: string; fullName?: string; email?: string; phone?: string;
};

type Booking = {
  id: string; guestId: string; roomId?: string;
  checkInDate?: string; checkOutDate?: string; bookingStatus?: string;
};
type RoomDTO  = { id: string; roomNumber?: number; hotelName?: string; hotelId?: string };

interface StayOption {
  bookingId: string;
  hotelName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
}

function normalizeList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const d = data as Record<string, unknown>;
  if (d && Array.isArray(d.content)) return d.content;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
}

function clampRating(v: number): number {
  if (!isFinite(v)) return 1;
  return Math.max(1, Math.min(10, Math.round(v)));
}

function guestName(g: Guest) {
  const fn = g.firstName ?? g.name ?? "";
  const ln = g.lastName  ?? g.surname ?? "";
  return `${fn} ${ln}`.trim() || g.fullName || "—";
}

function guestMeta(g: Guest) {
  return [g.email, g.phone].filter(Boolean).join(" · ");
}

function fmtDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit" }).format(dt);
}

function RatingPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const v = clampRating(value);
  return (
    <div className="rating-picker">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button key={n} type="button"
          className={`rating-star${n <= v ? " rating-star-active" : ""}`}
          aria-label={`Set rating ${n}`} title={`${n}/10`}
          onClick={() => onChange(n)}>
          <Star size={16} />
        </button>
      ))}
      <span className="rating-label">{v}/10</span>
    </div>
  );
}

const MAX_CHARS = 800;

export default function AddFeedbackReview() {
  const { t } = useTranslation();
  const router = useRouter();

  // Role detection
  const [userRole] = useState<string>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("role") ?? "ADMIN") : "ADMIN"
  );
  const isUser = userRole === "USER";

  /* ── STATE ── */
  const [guests,        setGuests]        = useState<Guest[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(true);
  const [guestsError,   setGuestsError]   = useState<string | null>(null);

  // Guest picker (ADMIN/RECEPTION)
  const [guestQuery,    setGuestQuery]    = useState("");
  const [guestId,       setGuestId]       = useState("");
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);

  // My stay info (USER)
  const [myGuest,       setMyGuest]       = useState<Guest | null>(null);
  const [myStays,       setMyStays]       = useState<StayOption[]>([]);
  const [selectedStay,  setSelectedStay]  = useState<StayOption | null>(null);
  const [staysLoading,  setStaysLoading]  = useState(false);

  // Manual stay info (ADMIN/RECEPTION)
  const [stayLoading,  setStayLoading]  = useState(false);
  const [hotelName,    setHotelName]    = useState("—");
  const [roomNumber,   setRoomNumber]   = useState("—");
  const [stayDates,    setStayDates]    = useState("—");

  const [feedbackText, setFeedbackText] = useState("");
  const [comment,      setComment]      = useState("");
  const [rating,       setRating]       = useState(8);

  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── LOAD GUESTS ── */
  useEffect(() => {
    let alive = true;
    api.get("/api/guests", { params: { size: 500 } })
      .then(r => { if (alive) setGuests(normalizeList(r.data) as Guest[]); })
      .catch(e => { if (alive) setGuestsError(e?.message ?? "Failed to load guests."); })
      .finally(() => { if (alive) setGuestsLoading(false); });
    return () => { alive = false; };
  }, []);

  /* ── AUTO-DETECT LOGGED-IN USER → find guest by email ── */
  useEffect(() => {
    if (!isUser || guests.length === 0) return;
    const email = typeof window !== "undefined" ? localStorage.getItem("email") ?? "" : "";
    if (!email) return;

    const found = guests.find(g => (g.email ?? "").toLowerCase() === email.toLowerCase());
    if (!found) return;

    setMyGuest(found);
    setGuestId(found.id);

    // Load their bookings
    setStaysLoading(true);
    api.get("/api/bookings")
      .then(async res => {
        const all = normalizeList(res.data) as Booking[];
        const mine = all.filter(b => String(b.guestId) === String(found.id));
        mine.sort((a, b) =>
          new Date(b.checkInDate ?? "").getTime() - new Date(a.checkInDate ?? "").getTime()
        );

        // Resolve room → hotelName for each booking
        const stays: StayOption[] = [];
        await Promise.all(mine.map(async b => {
          try {
            const rRes = await api.get<RoomDTO>(`/api/rooms/${b.roomId}`);
            stays.push({
              bookingId: b.id,
              hotelName: rRes.data?.hotelName ?? "Unknown Hotel",
              roomNumber: rRes.data?.roomNumber != null ? String(rRes.data.roomNumber) : "—",
              checkIn: fmtDate(b.checkInDate),
              checkOut: fmtDate(b.checkOutDate),
            });
          } catch { /* skip */ }
        }));

        stays.sort((a, b) => a.hotelName.localeCompare(b.hotelName));
        setMyStays(stays);
        if (stays.length > 0) setSelectedStay(stays[0]);
      })
      .catch(() => {})
      .finally(() => setStaysLoading(false));
  }, [isUser, guests]);

  /* ── ADMIN/RECEPTION: load stay info when guest selected ── */
  const filteredGuests = useMemo(() => {
    const q = guestQuery.trim().toLowerCase();
    const list = q ? guests.filter(g =>
      [guestName(g), guestMeta(g), g.id].some(v => v.toLowerCase().includes(q))
    ) : guests;
    return list.slice(0, 10);
  }, [guests, guestQuery]);

  async function loadStayInfo(gId: string) {
    setStayLoading(true);
    setHotelName("—"); setRoomNumber("—"); setStayDates("—");
    try {
      const bookingsRes = await api.get("/api/bookings");
      const all = normalizeList(bookingsRes.data) as Booking[];
      const mine = all.filter(b => String(b.guestId) === String(gId));
      if (!mine.length) { setHotelName("No booking found"); return; }
      mine.sort((a, b) => new Date(b.checkInDate ?? "").getTime() - new Date(a.checkInDate ?? "").getTime());
      const latest = mine[0];
      setStayDates(`${fmtDate(latest.checkInDate)} → ${fmtDate(latest.checkOutDate)}`);
      if (latest.roomId) {
        const rRes = await api.get<RoomDTO>(`/api/rooms/${latest.roomId}`);
        setHotelName(rRes.data?.hotelName ?? "—");
        setRoomNumber(rRes.data?.roomNumber != null ? String(rRes.data.roomNumber) : "—");
      }
    } catch { setHotelName("—"); }
    finally { setStayLoading(false); }
  }

  function selectGuest(g: Guest) {
    setSelectedGuest(g);
    setGuestId(g.id);
    setGuestQuery(guestName(g));
    setDropdownOpen(false);
    loadStayInfo(g.id);
  }

  function clearGuest() {
    setSelectedGuest(null); setGuestId(""); setGuestQuery("");
    setDropdownOpen(false); setHotelName("—"); setRoomNumber("—"); setStayDates("—");
  }

  const canSubmit = !!guestId && feedbackText.trim().length > 0 && feedbackText.length <= MAX_CHARS && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await api.post("/api/feedback-reviews", {
        guestId,
        feedbackText: feedbackText.trim(),
        comment: comment.trim() || undefined,
        rating: clampRating(rating),
      });
      setSuccess(true);
      setTimeout(() => router.push("/feedback"), 1400);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fade-in form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('addReview')}</h1>
          <p className="page-subtitle">{t('addReviewSubtitle')}</p>
        </div>
        <Link href="/feedback" className="btn btn-secondary">
          <ArrowLeft size={14} /> {t('back')}
        </Link>
      </div>

      <div className="form-card">
        <div className="form-header">
          <div className="avatar-sm"><MessageSquare size={14} /></div>
          <div className="form-header-text">
            <p className="form-heading">{t('feedbackDetails')}</p>
            <p className="form-subheading">
              {isUser ? t('addReviewSubtitle') : t('feedbackRequired')}
            </p>
          </div>
        </div>

        {success && <div className="feedback-success">{t('reviewSubmittedSuccess')}</div>}
        {error   && <div className="feedback-error"><AlertCircle size={15} /> {error}</div>}

        <form onSubmit={handleSubmit} className="form-body">

          {/* ── USER MODE: auto guest + stay picker ── */}
          {isUser ? (
            <>
              {/* Auto-detected guest card */}
              <div className="form-field">
                <label className="form-label">{t('yourProfile')}</label>
                {guestsLoading ? (
                  <p style={{ fontSize: ".85rem", color: "#64748b" }}>{t('loadingProfile', 'Loading your profile…')}</p>
                ) : myGuest ? (
                  <div className={styles.guestCard}>
                    <div className={styles.guestAvatar}>
                      {(myGuest.firstName ?? myGuest.name ?? "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className={styles.guestName}>{guestName(myGuest)}</div>
                      <div className={styles.guestMeta}>{guestMeta(myGuest)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="feedback-error">
                    <AlertCircle size={13} />
                    No guest profile found for your account. Please contact the reception.
                  </div>
                )}
              </div>

              {/* Stay picker */}
              <div className="form-field">
                <label className="form-label">{t('selectYourStay')}</label>
                {staysLoading ? (
                  <p style={{ fontSize: ".85rem", color: "#64748b" }}>{t('loadingStays', 'Loading your stays…')}</p>
                ) : myStays.length === 0 ? (
                  <div className="feedback-error">
                    <AlertCircle size={13} />
                    No completed stays found. You need at least one booking to leave a review.
                  </div>
                ) : (
                  <div className={styles.stayList}>
                    {myStays.map(stay => (
                      <label key={stay.bookingId}
                        className={`${styles.stayOption}${selectedStay?.bookingId === stay.bookingId ? ` ${styles.selected}` : ""}`}>
                        <input type="radio" name="stay" value={stay.bookingId}
                          className={styles.stayRadio}
                          checked={selectedStay?.bookingId === stay.bookingId}
                          onChange={() => setSelectedStay(stay)} />
                        <div>
                          <div className={styles.stayHotel}>🏨 {stay.hotelName}</div>
                          <div className={styles.stayDates}>
                            Room {stay.roomNumber} · {stay.checkIn} → {stay.checkOut}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── ADMIN/RECEPTION MODE: guest combobox ── */
            <>
              <div className="form-field">
                <div className="form-label-row">
                  <label className="form-label">{t('guest')} *</label>
                  {selectedGuest && (
                    <button type="button" className="form-label-action" onClick={clearGuest} title="Clear guest">
                      <X size={12} /> Clear
                    </button>
                  )}
                </div>

                {guestsError && <div className="feedback-error"><AlertCircle size={13} /> {guestsError}</div>}

                <div className="combobox">
                  <input className="form-input" type="text"
                    placeholder={guestsLoading ? "Loading guests…" : "Search by name, email…"}
                    value={guestQuery} disabled={guestsLoading}
                    onChange={e => { setGuestQuery(e.target.value); setDropdownOpen(true); setSelectedGuest(null); setGuestId(""); }}
                    onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setDropdownOpen(true); }}
                    onBlur={() => { blurTimer.current = setTimeout(() => setDropdownOpen(false), 150); }}
                    aria-label="Search guest" />

                  {dropdownOpen && !guestsLoading && (
                    <div className="combobox-dropdown">
                      {filteredGuests.length === 0 ? (
                        <div className="combobox-empty">No guests found.</div>
                      ) : (
                        <ul>
                          {filteredGuests.map(g => (
                            <li key={g.id}>
                              <button type="button" className="combobox-item"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => selectGuest(g)}>
                                <div className="combobox-item-name">{guestName(g)}</div>
                                {guestMeta(g) && <div className="combobox-item-meta">{guestMeta(g)}</div>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Stay info for selected guest */}
              {selectedGuest && (
                <div className="stay-info-grid">
                  <div className="stay-info-card">
                    <p className="stay-info-label">{t('hotel')}</p>
                    <p className="stay-info-value">{stayLoading ? "Loading…" : hotelName}</p>
                  </div>
                  <div className="stay-info-card">
                    <p className="stay-info-label">{t('room')}</p>
                    <p className="stay-info-value">{stayLoading ? "…" : roomNumber}</p>
                  </div>
                  <div className="stay-info-card">
                    <p className="stay-info-label">{t('dates')}</p>
                    <p className="stay-info-value">{stayLoading ? "…" : stayDates}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Feedback text */}
          <div className="form-field">
            <div className="form-label-row">
              <label className="form-label" htmlFor="fb-text">{t('feedbackText')}</label>
              <span className={`form-char-count${feedbackText.length >= MAX_CHARS ? " form-char-count-limit" : ""}`}>
                {feedbackText.length}/{MAX_CHARS}
              </span>
            </div>
            <textarea id="fb-text" className="form-textarea" rows={5} maxLength={MAX_CHARS}
              placeholder={isUser
                ? `Share your experience at ${selectedStay?.hotelName ?? "the hotel"}…`
                : "Write the guest feedback here…"}
              value={feedbackText} onChange={e => setFeedbackText(e.target.value)} required />
          </div>

          {/* Comment (optional) */}
          <div className="form-field">
            <label className="form-label" htmlFor="fb-comment">{t('commentOptional')}</label>
            <textarea id="fb-comment" className="form-textarea" rows={3} maxLength={400}
              placeholder="Additional comment or internal note…"
              value={comment} onChange={e => setComment(e.target.value)} />
          </div>

          {/* Rating */}
          <div className="form-field">
            <label className="form-label">{t('ratingLabel')}</label>
            <RatingPicker value={rating} onChange={setRating} />
            <input className="form-input" type="number" min={1} max={10}
              value={rating} onChange={e => setRating(clampRating(parseInt(e.target.value || "1", 10)))}
              title="Rating value" placeholder="1-10" />
          </div>

          <button type="submit" className="form-button"
            disabled={!canSubmit || success || (isUser && myStays.length === 0)}>
            {submitting ? t('submittingReview') : t('submitReview')}
          </button>
        </form>
      </div>
    </div>
  );
}
