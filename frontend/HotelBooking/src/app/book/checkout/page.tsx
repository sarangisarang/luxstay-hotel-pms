"use client";

/**
 * Public checkout page.
 *
 * Prices come from the server (POST /api/public/bookings/quote), so the total
 * shown here is exactly what the booking and the Stripe charge use. The page
 * never collects card data itself: online payment goes through the Stripe
 * Payment Element, and "pay at the hotel" books without any payment at all.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Hotel, Calendar, Users, CreditCard, User, Mail, Phone, ArrowLeft, Lock, ShoppingBag, Building2, Tag } from "lucide-react";
import s from "@/styles/Checkout.module.css";
import { type BookingConfirmation, confirmationQuery, errorMessage, money } from "@/components/lib/onlineBooking";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type ServiceItem = { id: string; name: string; description: string; price: number };

type Quote = {
  nights: number;
  nightly: { date: string; price: number }[];
  roomTotal: number;
  services: { id: string; name: string; price: number }[];
  servicesTotal: number;
  voucherCode: string | null;
  voucherName: string | null;
  discount: number;
  total: number;
  currency: string;
};

type BookingOptions = {
  payAtHotel: boolean;
  onlinePayment: boolean;
  stripePublishableKey: string | null;
  maxNights: number;
};

type StripeCheckout = {
  bookingId: string;
  reference: string;
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  publishableKey: string;
  holdExpiresAt: string;
};

type PaymentOption = "PAY_AT_HOTEL" | "STRIPE";

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

  const stay = {
    roomId:   params.get("roomId")   ?? "",
    checkIn:  params.get("checkIn")  ?? "",
    checkOut: params.get("checkOut") ?? "",
    hotel:    params.get("hotel")    ?? "",
    room:     params.get("room")     ?? "",
    type:     params.get("type")     ?? "",
    imageUrl: params.get("imageUrl") ?? "",
  };

  const [guest, setGuest] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [specialRequests, setSpecialRequests] = useState("");
  const [options, setOptions] = useState<BookingOptions | null>(null);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>("PAY_AT_HOTEL");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeCheckout, setStripeCheckout] = useState<StripeCheckout | null>(null);

  // Payment options and add-on services
  useEffect(() => {
    fetch(`${API_BASE}/api/public/bookings/options`)
      .then(r => (r.ok ? r.json() : null))
      .then((o: BookingOptions | null) => {
        if (!o) return;
        setOptions(o);
        setPaymentOption(o.payAtHotel ? "PAY_AT_HOTEL" : "STRIPE");
      })
      .catch(() => {});
    fetch(`${API_BASE}/api/public/bookings/services`)
      .then(r => (r.ok ? r.json() : []))
      .then((d: ServiceItem[]) => setServices(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [API_BASE]);

  // Server-side quote whenever the stay, the services or the voucher change
  const requestQuote = useCallback(async (voucherCode: string | null) => {
    const res = await fetch(`${API_BASE}/api/public/bookings/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: stay.roomId, checkIn: stay.checkIn, checkOut: stay.checkOut,
        serviceIds: selectedServices, voucherCode,
      }),
    });
    if (!res.ok) throw new Error(await errorMessage(res, "Could not calculate the price."));
    return (await res.json()) as Quote;
  }, [API_BASE, stay.roomId, stay.checkIn, stay.checkOut, selectedServices]);

  useEffect(() => {
    if (!stay.roomId || !stay.checkIn || !stay.checkOut) return;
    let alive = true;
    requestQuote(appliedVoucher)
      .then(q => { if (alive) { setQuote(q); setQuoteError(null); } })
      .catch((e: Error) => {
        if (!alive) return;
        if (appliedVoucher) {
          // The voucher no longer applies (e.g. services changed): drop it and requote
          setVoucherError(e.message);
          setAppliedVoucher(null);
        } else {
          setQuote(null);
          setQuoteError(e.message);
        }
      });
    return () => { alive = false; };
  }, [requestQuote, appliedVoucher, stay.roomId, stay.checkIn, stay.checkOut]);

  async function applyVoucher() {
    const code = voucherInput.trim();
    if (!code) return;
    setVoucherError(null);
    try {
      const q = await requestQuote(code);
      setAppliedVoucher(code);
      setQuote(q);
    } catch (e) {
      setVoucherError(e instanceof Error ? e.message : "Invalid voucher code");
    }
  }

  function toggleService(id: string) {
    setSelectedServices(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  const currency = quote?.currency ?? "EUR";
  const imgSrc = stay.imageUrl
    ? (stay.imageUrl.startsWith("http") ? stay.imageUrl : `${API_BASE}/${stay.imageUrl}`)
    : null;

  function bookingBody() {
    return JSON.stringify({
      roomId: stay.roomId, checkIn: stay.checkIn, checkOut: stay.checkOut,
      firstName: guest.firstName.trim(), lastName: guest.lastName.trim(),
      email: guest.email.trim(), phone: guest.phone.trim() || null,
      serviceIds: selectedServices, voucherCode: appliedVoucher,
      specialRequests: specialRequests.trim() || null,
    });
  }

  function goToConfirmation(c: BookingConfirmation) {
    router.push(`/book/confirmation?${confirmationQuery(c)}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guest.firstName.trim() || !guest.lastName.trim() || !guest.email.trim()) {
      setError(t("checkoutFillRequired", "Please fill in all required fields."));
      return;
    }
    if (!quote) {
      setError(quoteError ?? t("checkoutNoPrice", "The price could not be calculated."));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (paymentOption === "PAY_AT_HOTEL") {
        const res = await fetch(`${API_BASE}/api/public/bookings/pay-at-hotel`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: bookingBody(),
        });
        if (!res.ok) throw new Error(await errorMessage(res, "Booking failed."));
        goToConfirmation(await res.json());
      } else {
        const res = await fetch(`${API_BASE}/api/public/stripe/create-payment-intent`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: bookingBody(),
        });
        if (!res.ok) throw new Error(await errorMessage(res, "Online payment could not be started."));
        setStripeCheckout(await res.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  const stripePromise = useMemo<Promise<Stripe | null> | null>(
    () => (stripeCheckout?.publishableKey ? loadStripe(stripeCheckout.publishableKey) : null),
    [stripeCheckout?.publishableKey]
  );

  const canPayAtHotel = options?.payAtHotel ?? true;
  const canPayOnline = options?.onlinePayment ?? false;

  return (
    <div className={s.page}>
      {/* Hero */}
      <div className={s.hero}>
        <div className={s.heroInner}>
          <button type="button" onClick={() => router.push("/book")} className={s.backBtn}>
            <ArrowLeft size={15} /> {t("backToRooms", "Back to rooms")}
          </button>
          <h1 className={s.heroTitle}>{t("completeYourBooking", "Complete your booking")}</h1>
          <p className={s.heroSub}>{t("checkoutSubtitle", "Your price is calculated by the hotel and shown before you book")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={s.grid}>

          {/* Left column */}
          <div className={s.left}>

            {/* Guest info */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.iconBubble}><User size={18} /></span>
                <div>
                  <p className={s.cardTitle}>{t("guestInformation", "Guest information")}</p>
                  <p className={s.cardSub}>{t("fieldsRequired", "Fields marked * are required")}</p>
                </div>
              </div>
              <div className={s.cardBody}>
                <div className={s.fieldGrid2}>
                  <Field label={`${t("firstName", "First name")} *`} icon={<User size={14}/>} value={guest.firstName}
                    onChange={v => setGuest(g => ({ ...g, firstName: v }))} placeholder="John" maxLength={100}
                    disabled={!!stripeCheckout} autoComplete="given-name" />
                  <Field label={`${t("lastName", "Last name")} *`} icon={<User size={14}/>} value={guest.lastName}
                    onChange={v => setGuest(g => ({ ...g, lastName: v }))} placeholder="Doe" maxLength={100}
                    disabled={!!stripeCheckout} autoComplete="family-name" />
                </div>
                <div className={s.fieldGrid2mt}>
                  <Field label={`${t("email", "Email")} *`} icon={<Mail size={14}/>} type="email" value={guest.email}
                    onChange={v => setGuest(g => ({ ...g, email: v }))} placeholder="john@example.com" maxLength={254}
                    disabled={!!stripeCheckout} autoComplete="email" />
                  <Field label={t("phone", "Phone")} icon={<Phone size={14}/>} value={guest.phone}
                    onChange={v => setGuest(g => ({ ...g, phone: v }))} placeholder="+49 170 0000000" maxLength={40}
                    disabled={!!stripeCheckout} autoComplete="tel" />
                </div>
                <div className={s.fieldGrid2mt}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className={s.fieldLabel}>{t("specialRequests", "Special requests")}</label>
                    <textarea className={s.fieldInput} rows={2} maxLength={1000} value={specialRequests}
                      disabled={!!stripeCheckout} onChange={e => setSpecialRequests(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Add-on Services */}
            {services.length > 0 && (
              <div className={s.card}>
                <div className={s.cardHeader}>
                  <span className={s.iconBubble}><ShoppingBag size={18} /></span>
                  <div>
                    <p className={s.cardTitle}>{t("addOnServices", "Add-on services")}{stay.hotel ? ` — ${stay.hotel}` : ""}</p>
                    <p className={s.cardSub}>{t("addOnServicesSub", "Enhance your stay with extra services")}</p>
                  </div>
                </div>
                <div className={s.servicesList}>
                  {services.map(sv => {
                    const checked = selectedServices.includes(sv.id);
                    return (
                      <label key={sv.id} className={`${s.serviceItem}${checked ? ` ${s.serviceItemChecked}` : ""}`}>
                        <input type="checkbox" className={s.serviceCheckbox} checked={checked}
                          disabled={!!stripeCheckout} onChange={() => toggleService(sv.id)} />
                        <div className={s.serviceInfo}>
                          <div className={s.serviceName}>{sv.name}</div>
                          {sv.description && <div className={s.serviceDesc}>{sv.description}</div>}
                        </div>
                        <div className={s.servicePrice}>+{money(Number(sv.price), currency)}</div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Voucher */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.iconBubble}><Tag size={18} /></span>
                <div>
                  <p className={s.cardTitle}>{t("voucher", "Voucher")}</p>
                  <p className={s.cardSub}>{t("voucherSub", "Have a promo code? It is checked by the hotel before you book.")}</p>
                </div>
              </div>
              <div className={s.cardBody}>
                <div className={s.voucherRow}>
                  <input className={s.fieldInput} value={voucherInput} maxLength={64}
                    disabled={!!stripeCheckout || !!appliedVoucher}
                    onChange={e => { setVoucherInput(e.target.value); setVoucherError(null); }}
                    placeholder="SUMMER2026" />
                  {appliedVoucher ? (
                    <button type="button" className={s.secondaryBtn} disabled={!!stripeCheckout}
                      onClick={() => { setAppliedVoucher(null); setVoucherInput(""); }}>
                      {t("remove", "Remove")}
                    </button>
                  ) : (
                    <button type="button" className={s.secondaryBtn} disabled={!!stripeCheckout || !voucherInput.trim()}
                      onClick={applyVoucher}>
                      {t("apply", "Apply")}
                    </button>
                  )}
                </div>
                {voucherError && <p className={s.inlineError}>{voucherError}</p>}
              </div>
            </div>

            {/* Payment option */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.iconBubble}><CreditCard size={18} /></span>
                <div>
                  <p className={s.cardTitle}>{t("payment", "Payment")}</p>
                  <p className={s.cardSub}>{t("paymentSub", "Card details are only ever entered in Stripe's secure form")}</p>
                </div>
              </div>
              <div className={s.cardBodyFlex}>
                {canPayAtHotel && (
                  <label className={`${s.paymentOption}${paymentOption === "PAY_AT_HOTEL" ? ` ${s.paymentOptionActive}` : ""}`}>
                    <input type="radio" name="paymentOption" checked={paymentOption === "PAY_AT_HOTEL"}
                      disabled={!!stripeCheckout} onChange={() => setPaymentOption("PAY_AT_HOTEL")} />
                    <Building2 size={18} />
                    <span>
                      <strong>{t("payAtHotel", "Pay at the hotel")}</strong>
                      <small>{t("payAtHotelSub", "Your room is reserved now; you pay on arrival or departure.")}</small>
                    </span>
                  </label>
                )}
                {canPayOnline && (
                  <label className={`${s.paymentOption}${paymentOption === "STRIPE" ? ` ${s.paymentOptionActive}` : ""}`}>
                    <input type="radio" name="paymentOption" checked={paymentOption === "STRIPE"}
                      disabled={!!stripeCheckout} onChange={() => setPaymentOption("STRIPE")} />
                    <CreditCard size={18} />
                    <span>
                      <strong>{t("payOnline", "Pay online now")}</strong>
                      <small>{t("payOnlineSub", "Card and other methods via Stripe. The room is held for you while you pay.")}</small>
                    </span>
                  </label>
                )}
                {!canPayAtHotel && !canPayOnline && (
                  <p className={s.inlineError}>{t("noPaymentOptions", "Online booking is currently not available. Please contact the hotel.")}</p>
                )}

                {stripeCheckout && stripePromise && (
                  <div className={s.stripeBox}>
                    <p className={s.cardSub}>
                      {t("roomHeldUntil", "Your room is held until")}{" "}
                      {new Date(stripeCheckout.holdExpiresAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <Elements stripe={stripePromise} options={{ clientSecret: stripeCheckout.clientSecret }}>
                      <StripePaymentStep
                        checkout={stripeCheckout}
                        apiBase={API_BASE}
                        onConfirmed={goToConfirmation}
                        onProcessing={() => router.push(`/book/confirmation?reference=${encodeURIComponent(stripeCheckout.reference)}&paymentStatus=PROCESSING&total=${stripeCheckout.amount}&currency=${stripeCheckout.currency}`)}
                        onError={setError}
                      />
                    </Elements>
                  </div>
                )}
              </div>
            </div>

            {(error || quoteError) && <div className={s.errorAlert}>{error ?? quoteError}</div>}

            {!stripeCheckout && (
              <button type="submit" disabled={loading || !quote || (!canPayAtHotel && !canPayOnline)}
                className={`${s.submitBtn}${loading || !quote ? ` ${s.submitBtnDisabled}` : ""}`}>
                <Lock size={16} />
                {loading
                  ? t("processing", "Processing…")
                  : paymentOption === "PAY_AT_HOTEL"
                    ? `${t("bookNowPayAtHotel", "Book now, pay at the hotel")} — ${quote ? money(quote.total, currency) : "…"}`
                    : `${t("continueToPayment", "Continue to payment")} — ${quote ? money(quote.total, currency) : "…"}`}
              </button>
            )}
          </div>

          {/* Right: Summary */}
          <div className={s.cardSticky}>
            {imgSrc ? (
              <div className={s.summaryImg}>
                <img src={imgSrc} alt="Room" />
              </div>
            ) : (
              <div className={s.summaryImgFallback}>
                <Hotel size={36} color="#a5b4fc" />
              </div>
            )}
            <div className={s.summaryMeta}>
              {stay.type && <span className={s.summaryTypeBadge}>{stay.type}</span>}
              <p className={s.summaryRoomName}>{t("room", "Room")} {stay.room}</p>
              {stay.hotel && <p className={s.summaryHotel}>{stay.hotel}</p>}
            </div>
            <div className={s.summaryDivider} />
            <div className={s.summaryRows}>
              <SummaryRow icon={<Calendar size={14}/>} label={t("checkIn", "Check-in")}  value={fmtDate(stay.checkIn)} />
              <SummaryRow icon={<Calendar size={14}/>} label={t("checkOut", "Check-out")} value={fmtDate(stay.checkOut)} />
              <SummaryRow icon={<Users size={14}/>} label={t("duration", "Duration")}
                value={quote ? `${quote.nights} ${quote.nights === 1 ? t("night", "night") : t("nights", "nights")}` : "…"} />
            </div>
            <div className={s.summaryDivider} />
            <div className={s.summaryPricing}>
              {quote ? (
                <>
                  <div className={s.summaryPriceRow}>
                    <span className={s.summaryPriceLabel}>
                      {t("roomNights", "Room")} · {quote.nights} {quote.nights === 1 ? t("night", "night") : t("nights", "nights")}
                    </span>
                    <span className={s.summaryPriceValue}>{money(quote.roomTotal, currency)}</span>
                  </div>
                  {quote.servicesTotal > 0 && (
                    <div className={s.summaryPriceRow}>
                      <span className={s.summaryPriceLabel}>{t("services", "Services")}</span>
                      <span className={s.summaryPriceValue}>+{money(quote.servicesTotal, currency)}</span>
                    </div>
                  )}
                  {quote.discount > 0 && (
                    <div className={s.summaryPriceRow}>
                      <span className={s.summaryPriceLabel} style={{ color: "#16a34a" }}>🏷️ {quote.voucherName ?? quote.voucherCode}</span>
                      <span className={s.summaryPriceValue} style={{ color: "#16a34a" }}>−{money(quote.discount, currency)}</span>
                    </div>
                  )}
                  <div className={s.summaryTotal}>
                    <span className={s.summaryTotalLabel}>{t("total", "Total")}</span>
                    <span className={s.summaryTotalValue}>{money(quote.total, currency)}</span>
                  </div>
                </>
              ) : (
                <p className={s.cardSub}>{quoteError ?? t("calculatingPrice", "Calculating price…")}</p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/**
 * Stripe Payment Element plus the "Pay" button. After Stripe reports success,
 * the booking is confirmed on the server, which re-checks the payment with Stripe.
 */
function StripePaymentStep({ checkout, apiBase, onConfirmed, onProcessing, onError }: {
  checkout: StripeCheckout;
  apiBase: string;
  onConfirmed: (c: BookingConfirmation) => void;
  onProcessing: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    onError("");
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      // Used only by payment methods that need a redirect (e.g. bank authentication)
      confirmParams: { return_url: `${window.location.origin}/book/confirmation` },
      redirect: "if_required",
    });
    if (error) {
      onError(error.message ?? "Payment failed");
      setBusy(false);
      return;
    }
    if (paymentIntent?.status === "processing") {
      onProcessing();
      return;
    }
    if (paymentIntent?.status !== "succeeded") {
      onError("The payment was not completed.");
      setBusy(false);
      return;
    }
    const res = await fetch(`${apiBase}/api/public/bookings/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
    });
    if (!res.ok) {
      onError(await errorMessage(res, "Your payment was received, but the booking could not be confirmed. Please contact the hotel."));
      setBusy(false);
      return;
    }
    onConfirmed(await res.json());
  }

  return (
    <div>
      <PaymentElement />
      <button type="button" onClick={pay} disabled={!stripe || busy}
        className={`${s.submitBtn}${!stripe || busy ? ` ${s.submitBtnDisabled}` : ""}`} style={{ marginTop: 16 }}>
        <Lock size={16} />
        {busy ? t("processing", "Processing…") : `${t("payNow", "Pay now")} — ${money(checkout.amount, checkout.currency)}`}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", icon, maxLength, disabled, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ReactNode; maxLength?: number;
  disabled?: boolean; autoComplete?: string;
}) {
  return (
    <div>
      <label className={s.fieldLabel}>{icon} {label}</label>
      <input className={s.fieldInput} type={type} value={value} disabled={disabled}
        placeholder={placeholder} maxLength={maxLength} autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={s.summaryRow}>
      <span className={s.summaryRowLabel}>{icon} {label}</span>
      <span className={s.summaryRowValue}>{value}</span>
    </div>
  );
}
