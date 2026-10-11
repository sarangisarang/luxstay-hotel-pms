"use client";

/**
 * "My bookings" for a logged-in guest account. The server returns only the
 * bookings of this account (there is no e-mail field any more: the old page
 * listed and cancelled the bookings of whatever address was typed in).
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Hotel, Download } from "lucide-react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/GuestFunctions.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";
import GuestBookingList from "@/components/guest/GuestBookingList";
import type { GuestBooking } from "@/components/lib/onlineBooking";

export default function GuestPortalPage() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<GuestBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<GuestBooking[]>("/api/user/bookings")
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(e => setError(e?.response?.status === 403
        ? t("guestAccountsOnly", "This page is for guest accounts. Staff manage bookings under Bookings.")
        : e?.message ?? t("loadFailed", "Could not load your bookings.")));
  }, [t]);

  const cancel = useCallback(async (id: string): Promise<GuestBooking> => {
    const r = await api.post<GuestBooking>(`/api/user/bookings/${encodeURIComponent(id)}/cancel`);
    return r.data;
  }, []);

  async function downloadMyData() {
    try {
      const r = await api.get("/api/user/data-export");
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <Hotel size={36} className={s.heroIcon} />
        <h1 className={s.heroTitle}>{t("myBookings", "My bookings")}</h1>
        <p className={s.heroSub}>
          {t("myBookingsSub", "Bookings of your account. Bookings made without logging in can be managed with the link from the confirmation e-mail.")}
        </p>
      </div>

      <div className={s.results}>
        {error && <div className={s.bannerError}>{error}</div>}
        {bookings === null && !error && <p className={s.countLine}>{t("loading", "Loading…")}</p>}
        {bookings !== null && <GuestBookingList bookings={bookings} onCancel={cancel} />}

        <Link href="/book/manage" className={s.secondaryLink}>
          {t("findOtherBookings", "Find a booking made without an account")}
        </Link>
        <br />
        <button type="button" className={s.secondaryLink} onClick={downloadMyData}>
          <Download size={13} /> {t("downloadMyData", "Download my data (DSGVO)")}
        </button>
      </div>
    </div>
  );
}
