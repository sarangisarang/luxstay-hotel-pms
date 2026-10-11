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
  }).toString();
}

/** Reads the message the backend sends as {"error": "..."} (or a fallback). */
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body && (body.error || body.message)) || fallback;
}
