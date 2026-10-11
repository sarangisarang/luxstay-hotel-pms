"use client";

/**
 * Manage a booking without an account.
 *
 * With ?token=… (from the confirmation page or the e-mailed link) the guest
 * sees the bookings the token covers and can cancel them. Without a valid
 * token the guest asks for a link, which is sent to the booking's e-mail
 * address — knowing an address is no longer enough to see or cancel bookings.
 */
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarCheck, Hotel, Mail, Send } from "lucide-react";
import s from "@/styles/GuestFunctions.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";
import GuestBookingList from "@/components/guest/GuestBookingList";
import { type GuestBooking, errorMessage } from "@/components/lib/onlineBooking";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

function ManageBooking() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const token = params.get("token");

  const [bookings, setBookings] = useState<GuestBooking[] | null>(null);
  const [loading, setLoading] = useState(!!token);
  const [linkInvalid, setLinkInvalid] = useState(false);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/public/bookings/manage`, { headers: { "X-Booking-Token": token } })
      .then(async res => {
        if (res.status === 401) { setLinkInvalid(true); return; }
        if (!res.ok) throw new Error(await errorMessage(res, "Could not load your booking."));
        const body = await res.json();
        setBookings(Array.isArray(body.bookings) ? body.bookings : []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const cancel = useCallback(async (id: string): Promise<GuestBooking> => {
    const res = await fetch(`${API_BASE}/api/public/bookings/manage/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      headers: { "X-Booking-Token": token ?? "" },
    });
    if (!res.ok) throw new Error(await errorMessage(res, "The booking could not be cancelled."));
    return res.json();
  }, [token]);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setError(null); setSent(null);
    try {
      const res = await fetch(`${API_BASE}/api/public/bookings/manage/request-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Request failed. Please try again."));
      const body = await res.json();
      setSent(body.message ?? t("linkSentGeneric", "If we have bookings for this address, we have sent a link to it."));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const showForm = !token || linkInvalid;

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <Hotel size={36} className={s.heroIcon} />
        <h1 className={s.heroTitle}>{t("manageBookingTitle", "Manage your booking")}</h1>
        <p className={s.heroSub}>
          {showForm
            ? t("manageBookingIntro", "Enter the e-mail address you booked with. We will send you a secure link to view or cancel your bookings.")
            : t("manageBookingSub", "Your bookings. Cancellation is possible until the day of arrival.")}
        </p>

        {showForm && (
          <form onSubmit={requestLink} className={s.searchForm}>
            <Mail size={18} className={s.searchIcon} />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className={s.searchInput}
              aria-label={t("emailAddress", "E-mail address")}
            />
            <button type="submit" disabled={sending} className={s.searchBtn}>
              <Send size={15} /> {sending ? t("sending", "Sending…") : t("sendLink", "Send link")}
            </button>
          </form>
        )}
      </div>

      <div className={s.results}>
        {linkInvalid && (
          <div className={s.bannerError}>
            {t("manageLinkExpired", "This link is invalid or has expired. Request a new one above.")}
          </div>
        )}
        {error && <div className={s.bannerError}>{error}</div>}
        {sent && <div className={s.bannerSuccess}>{sent}</div>}

        {loading && <p className={s.countLine}>{t("loading", "Loading…")}</p>}

        {!loading && bookings !== null && (
          <GuestBookingList bookings={bookings} onCancel={cancel} />
        )}

        {showForm && !sent && !error && (
          <div className={s.emptyState}>
            <CalendarCheck size={44} className={s.emptyIcon} />
            <p className={s.emptyText}>{t("manageLinkHint", "The link is valid for 24 hours.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManageBookingPage() {
  return (
    <Suspense fallback={null}>
      <ManageBooking />
    </Suspense>
  );
}
