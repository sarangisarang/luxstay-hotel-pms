"use client";

/**
 * Booking confirmation page.
 *
 * Shows what the server confirmed. When Stripe redirects back here after a
 * payment that needed an extra step (bank authentication), the URL carries
 * `payment_intent`; the booking is then confirmed on the server first, which
 * re-checks the payment with Stripe.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Calendar, Hotel, Home, Clock, AlertTriangle } from "lucide-react";
import s from "@/styles/BookConfirmation.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";
import { type BookingConfirmation, errorMessage, money } from "@/components/lib/onlineBooking";

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });
}

export default function ConfirmationPage() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";
  const redirectIntent = params.get("payment_intent");

  const fromQuery: Partial<BookingConfirmation> = {
    reference:     params.get("reference") ?? undefined,
    guestName:     params.get("guestName") ?? undefined,
    email:         params.get("email") ?? undefined,
    hotel:         params.get("hotel") ?? undefined,
    room:          params.get("room") ? Number(params.get("room")) : undefined,
    checkIn:       params.get("checkIn") ?? undefined,
    checkOut:      params.get("checkOut") ?? undefined,
    total:         params.get("total") ? Number(params.get("total")) : undefined,
    currency:      params.get("currency") ?? "EUR",
    bookingStatus: params.get("bookingStatus") ?? undefined,
    paymentStatus: params.get("paymentStatus") ?? undefined,
    paymentOption: params.get("paymentOption") ?? undefined,
  };

  const [booking, setBooking] = useState<Partial<BookingConfirmation>>(fromQuery);
  const [confirming, setConfirming] = useState(!!redirectIntent);
  const [error, setError] = useState<string | null>(null);

  // Stripe redirect flow: confirm on the server before showing anything as booked
  useEffect(() => {
    if (!redirectIntent) return;
    fetch(`${API_BASE}/api/public/bookings/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: redirectIntent }),
    })
      .then(async res => {
        if (!res.ok) throw new Error(await errorMessage(res, "The payment could not be verified."));
        setBooking(await res.json());
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setConfirming(false));
  }, [API_BASE, redirectIntent]);

  const processing = booking.paymentStatus === "PROCESSING";
  const expired = booking.bookingStatus === "CANCELLED" || booking.paymentStatus === "REFUND_REQUIRED";
  const paid = booking.paymentStatus === "PAID";
  const currency = booking.currency ?? "EUR";

  if (confirming) {
    return (
      <div className={s.root}><div className={s.wrap}>
        <div className={s.header}><h1 className={s.h1}>{t("verifyingPayment", "Verifying your payment…")}</h1></div>
      </div></div>
    );
  }

  const title = error
    ? t("paymentNotVerified", "We could not confirm your booking")
    : expired
      ? t("reservationExpired", "Your reservation had expired")
      : processing
        ? t("paymentProcessing", "Payment is being processed")
        : t("bookingConfirmed", "Booking confirmed!");

  const subtitle = error
    ? error
    : expired
      ? t("reservationExpiredSub", "The payment arrived after the room hold ended. The hotel will refund it.")
      : processing
        ? t("paymentProcessingSub", "You will receive an email as soon as the payment is complete.")
        : booking.email
          ? `${t("confirmationSentTo", "A confirmation was sent to")} ${booking.email}`
          : t("roomReservedCheckEmail", "Your room is reserved. Please check your email.");

  return (
    <div className={s.root}>
      <div className={s.wrap}>

        <div className={s.header}>
          <div className={s.iconCircle}>
            {error || expired
              ? <AlertTriangle size={40} color="white" strokeWidth={2.5} />
              : processing
                ? <Clock size={40} color="white" strokeWidth={2.5} />
                : <CheckCircle size={40} color="white" strokeWidth={2.5} />}
          </div>
          <h1 className={s.h1}>{title}</h1>
          <p className={s.sub}>{subtitle}</p>
        </div>

        {!error && (
          <div className={s.bookingCard}>
            <div className={s.banner}>
              <div>
                <p className={s.refLabel}>{t("bookingReference", "Booking reference")}</p>
                <p className={s.refCode}>{booking.reference ? `#${booking.reference}` : "—"}</p>
              </div>
              <span className={s.confirmedBadge}>
                {expired ? "EXPIRED" : processing ? "PROCESSING" : booking.bookingStatus ?? "CONFIRMED"}
              </span>
            </div>

            <div className={s.details}>
              {booking.guestName && <Row label={t("guest", "Guest")} value={booking.guestName} />}
              {booking.hotel && <Row label={t("hotel", "Hotel")} value={booking.hotel} icon={<Hotel size={15} color="#4f46e5" />} />}
              {booking.room ? <Row label={t("room", "Room")} value={`${t("room", "Room")} ${booking.room}`} /> : null}
              {booking.checkIn && <Row label={t("checkIn", "Check-in")} value={fmtDate(booking.checkIn)} icon={<Calendar size={15} color="#4f46e5" />} />}
              {booking.checkOut && <Row label={t("checkOut", "Check-out")} value={fmtDate(booking.checkOut)} icon={<Calendar size={15} color="#4f46e5" />} />}
            </div>

            {booking.total !== undefined && !Number.isNaN(booking.total) && (
              <>
                <div className={s.dashedDivider} />
                <div className={s.totalRow}>
                  <span className={s.totalLabel}>
                    {paid
                      ? t("totalPaid", "Total paid")
                      : booking.paymentOption === "PAY_AT_HOTEL"
                        ? t("totalPayAtHotel", "Total — to be paid at the hotel")
                        : t("total", "Total")}
                  </span>
                  <span className={s.totalValue}>{money(Number(booking.total), currency)}</span>
                </div>
              </>
            )}
          </div>
        )}

        <div className={s.nextBox}>
          <p className={s.nextTitle}>{t("whatsNext", "What's next")}</p>
          <ul className={s.nextList}>
            <li>{t("nextCheckInbox", "Check your inbox for the confirmation email.")}</li>
            <li>{t("nextPresentRef", "Show your booking reference at the front desk.")}</li>
            <li>{t("nextCheckInTime", "Check-in starts at the time stated by the hotel.")}</li>
          </ul>
        </div>

        <div className={s.actions}>
          <Link href="/book" className={s.btnLink}>
            <button type="button" className={s.btnOutline}>
              <Hotel size={16} /> {t("bookAnotherRoom", "Book another room")}
            </button>
          </Link>
          <Link href="/" className={s.btnLink}>
            <button type="button" className={s.btnSolid}>
              <Home size={16} /> {t("backToHome", "Back to home")}
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
