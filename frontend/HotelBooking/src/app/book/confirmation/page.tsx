"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Calendar, Hotel, Home } from "lucide-react";
import s from "@/styles/BookConfirmation.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });
}

export default function ConfirmationPage() {
  const { t } = useTranslation();
  const params = useSearchParams();

  const bookingId = params.get("bookingId") ?? "";
  const guestName = params.get("guestName") ?? "";
  const hotel     = params.get("hotel")     ?? "";
  const room      = params.get("room")      ?? "";
  const checkIn   = params.get("checkIn")   ?? "";
  const checkOut  = params.get("checkOut")  ?? "";
  const total     = params.get("total")     ?? "";
  const email     = params.get("email")     ?? "";

  return (
    <div className={s.root}>
      <div className={s.wrap}>

        {/* Success header */}
        <div className={s.header}>
          <div className={s.iconCircle}>
            <CheckCircle size={40} color="white" strokeWidth={2.5} />
          </div>
          <h1 className={s.h1}>{t('bookingConfirmed')}</h1>
          <p className={s.sub}>
            {email
              ? `${t('confirmationSentTo')} ${email}`
              : t('roomReservedCheckEmail')}
          </p>
        </div>

        {/* Booking card */}
        <div className={s.bookingCard}>
          <div className={s.banner}>
            <div>
              <p className={s.refLabel}>{t('bookingReference')}</p>
              <p className={s.refCode}>{bookingId ? `#${bookingId}` : "—"}</p>
            </div>
            <span className={s.confirmedBadge}>CONFIRMED</span>
          </div>

          <div className={s.details}>
            {guestName && <Row label={t('guest')}    value={guestName} />}
            {hotel     && <Row label={t('hotel')}    value={hotel}     icon={<Hotel size={15} color="#4f46e5" />} />}
            {room      && <Row label={t('room')}     value={`${t('room')} ${room}`} />}
            {checkIn   && <Row label={t('checkIn')}  value={fmtDate(checkIn)}  icon={<Calendar size={15} color="#4f46e5" />} />}
            {checkOut  && <Row label={t('checkOut')} value={fmtDate(checkOut)} icon={<Calendar size={15} color="#4f46e5" />} />}
          </div>

          {total && (
            <>
              <div className={s.dashedDivider} />
              <div className={s.totalRow}>
                <span className={s.totalLabel}>{t('totalPaid')}</span>
                <span className={s.totalValue}>€{Number(total).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {/* What's next */}
        <div className={s.nextBox}>
          <p className={s.nextTitle}>{t('whatsNext')}</p>
          <ul className={s.nextList}>
            <li>{t('nextCheckInbox')}</li>
            <li>{t('nextPresentRef')}</li>
            <li>{t('nextCheckInTime')}</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className={s.actions}>
          <Link href="/book" className={s.btnLink}>
            <button type="button" className={s.btnOutline}>
              <Hotel size={16} /> {t('bookAnotherRoom')}
            </button>
          </Link>
          <Link href="/" className={s.btnLink}>
            <button type="button" className={s.btnSolid}>
              <Home size={16} /> {t('backToHome')}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className={s.row}>
      <span className={s.rowLabel}>{icon} {label}</span>
      <span className={s.rowValue}>{value}</span>
    </div>
  );
}
