/**
 * Shared helpers for the public booking pages (checkout and confirmation).
 * Kept out of the page files because Next.js only allows Page exports there.
 */

/** Booking summary returned by the public booking API. */
export type BookingConfirmation = {
  bookingId: string;
  reference: string;
  guestName: string;
  email: string;
  hotel: string;
  room: number;
  checkIn: string;
  checkOut: string;
  total: number;
  currency: string;
  bookingStatus: string;
  paymentStatus: string;
  paymentOption: string;
  /** Hotel's check-in / check-out time, e.g. "15:00" (null when not configured). */
  checkInTime?: string | null;
  checkOutTime?: string | null;
  /** Signed token that lets the booker view or cancel this one booking. */
  manageToken?: string | null;
};

/** A booking as shown to the guest (account pages and manage link). */
export type GuestBooking = {
  id: string;
  reference: string;
  hotel: string;
  roomNumber: number | null;
  roomType: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  canCancel: boolean;
  cancellationPolicy: string | null;
};

/** Formats an amount in the hotel's currency (falls back to "1.00 EUR" style). */
export function money(amount: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Query string for the confirmation page, built from the server's answer. */
export function confirmationQuery(c: BookingConfirmation): string {
  return new URLSearchParams({
    bookingId: c.bookingId,
    reference: c.reference,
    guestName: c.guestName ?? "",
    email: c.email ?? "",
    hotel: c.hotel ?? "",
    room: String(c.room ?? ""),
    checkIn: c.checkIn,
    checkOut: c.checkOut,
    total: String(c.total),
    currency: c.currency,
    bookingStatus: c.bookingStatus,
    paymentStatus: c.paymentStatus,
    paymentOption: c.paymentOption,
    checkInTime: c.checkInTime ?? "",
    checkOutTime: c.checkOutTime ?? "",
    manageToken: c.manageToken ?? "",
  }).toString();
}

/** Reads the message the backend sends as {"error": "..."} (or a fallback). */
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body && (body.error || body.message)) || fallback;
}
