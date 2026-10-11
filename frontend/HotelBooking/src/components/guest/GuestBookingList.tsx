"use client";

/**
 * Booking cards for guests: used by "My bookings" (logged-in guest account)
 * and by the e-mailed manage-booking link. The server decides which bookings
 * may be cancelled (canCancel); this component only asks for confirmation.
 */
import { useState } from "react";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import s from "@/styles/GuestFunctions.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";
import { type GuestBooking, money } from "@/components/lib/onlineBooking";

const STATUS_META: Record<string, { badgeCls: string; icon: React.ReactNode }> = {
  CONFIRMED:   { badgeCls: s.badgeConfirmed,  icon: <CheckCircle size={13} /> },
  CHECKED_IN:  { badgeCls: s.badgeCheckedIn,  icon: <CheckCircle size={13} /> },
  CHECKED_OUT: { badgeCls: s.badgeCheckedOut, icon: <Clock size={13} /> },
  COMPLETED:   { badgeCls: s.badgeCompleted,  icon: <CheckCircle size={13} /> },
  CANCELLED:   { badgeCls: s.badgeCancelled,  icon: <XCircle size={13} /> },
  PENDING:     { badgeCls: s.badgePending,    icon: <Clock size={13} /> },
};

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

type Props = {
  bookings: GuestBooking[];
  /** Cancels on the server and returns the updated booking. */
  onCancel: (id: string) => Promise<GuestBooking>;
};

export default function GuestBookingList({ bookings, onCancel }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<GuestBooking[]>(bookings);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function cancel(id: string) {
    setBusyId(id); setError(null); setDone(null);
    try {
      const updated = await onCancel(id);
      setItems(prev => prev.map(b => (b.id === id ? updated : b)));
      setDone(t("bookingCancelledOk", "The booking has been cancelled. You will receive a confirmation e-mail."));
    } catch (e) {
      setError((e as Error).message || t("cancelFailed", "The booking could not be cancelled."));
    } finally {
      setBusyId(null); setConfirmId(null);
    }
  }

  return (
    <>
      {error && <div className={s.bannerError}>{error}</div>}
      {done && <div className={s.bannerSuccess}>{done}</div>}

      <p className={s.countLine}>
        {items.length === 0
          ? t("noBookingsFound", "No bookings found.")
          : t("bookingsFoundCount", { count: items.length, defaultValue: "{{count}} booking(s)" })}
      </p>

      {items.map(b => {
        const meta = STATUS_META[b.status] ?? { badgeCls: s.badgeDefault, icon: null };
        const paidOnline = b.paymentStatus === "PAID" || b.paymentStatus === "PARTIALLY_PAID";
        return (
          <div key={b.id} className={s.card}>
            <div className={s.cardHead}>
              <div>
                <p className={s.cardHotel}>
                  {b.hotel || t("hotel", "Hotel")}
                  {b.roomNumber ? ` — ${t("room", "Room")} ${b.roomNumber}` : ""}
                  {b.roomType ? ` (${b.roomType})` : ""}
                </p>
                <p className={s.cardRef}>#{b.reference}</p>
              </div>
              <span className={`${s.badge} ${meta.badgeCls}`}>{meta.icon} {b.status}</span>
            </div>

            <div className={s.cardBody}>
              <div className={s.dateCols}>
                <div>
                  <p className={s.dateLabel}>{t("checkIn", "Check-in")}</p>
                  <p className={s.dateValue}>{fmtDate(b.checkIn)}</p>
                </div>
                <div>
                  <p className={s.dateLabel}>{t("checkOut", "Check-out")}</p>
                  <p className={s.dateValue}>{fmtDate(b.checkOut)}</p>
                </div>
                <div>
                  <p className={s.dateLabel}>{t("total", "Total")}</p>
                  <p className={s.totalValue}>{money(Number(b.total), b.currency || "EUR")}</p>
                </div>
              </div>

              {b.canCancel && (
                <div className={s.cardActions}>
                  {confirmId === b.id ? (
                    <>
                      <span className={s.confirmText}>{t("reallyCancel", "Cancel this booking?")}</span>
                      <button type="button" className={s.cancelBtn} disabled={busyId === b.id} onClick={() => cancel(b.id)}>
                        <XCircle size={14} /> {busyId === b.id ? t("cancelling", "Cancelling…") : t("yesCancel", "Yes, cancel")}
                      </button>
                      <button type="button" className={s.keepBtn} onClick={() => setConfirmId(null)}>
                        {t("keepBooking", "Keep booking")}
                      </button>
                    </>
                  ) : (
                    <button type="button" className={s.cancelBtn} onClick={() => setConfirmId(b.id)}>
                      <XCircle size={14} /> {t("cancelBooking", "Cancel booking")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {b.canCancel && (b.cancellationPolicy || paidOnline) && (
              <p className={s.policyNote}>
                {b.cancellationPolicy
                  ? `${t("cancellationPolicy", "Cancellation policy")}: ${b.cancellationPolicy}`
                  : t("refundByHotel", "Payments already made are refunded by the hotel.")}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
