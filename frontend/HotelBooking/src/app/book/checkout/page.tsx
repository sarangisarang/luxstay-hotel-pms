"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Hotel, Calendar, Users, CreditCard, User, Mail, Phone, ArrowLeft, Lock, ShoppingBag } from "lucide-react";
import s from "@/styles/Checkout.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type BookingSummary = {
  roomId: string; checkIn: string; checkOut: string; nights: number;
  hotel: string; room: string; type: string; price: number; total: number; imageUrl: string;
};
type ServiceItem = { id: string; name: string; description: string; price: number };

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

  const summary: BookingSummary = {
    roomId:   params.get("roomId")   ?? "",
    checkIn:  params.get("checkIn")  ?? "",
    checkOut: params.get("checkOut") ?? "",
    nights:   Number(params.get("nights") ?? 1),
    hotel:    params.get("hotel")    ?? "",
    room:     params.get("room")     ?? "",
    type:     params.get("type")     ?? "",
    price:    Number(params.get("price") ?? 0),
    total:    Number(params.get("total") ?? 0),
    imageUrl: params.get("imageUrl") ?? "",
  };

  const [guest, setGuest] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [card,  setCard]  = useState({ number: "", expiry: "", cvv: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [promoCode,      setPromoCode]      = useState("");
  const [promoApplied,   setPromoApplied]   = useState<{ code: string; discountAmount: number; name: string } | null>(null);
  const [promoError,     setPromoError]     = useState<string | null>(null);
  const [checkingPromo,  setCheckingPromo]  = useState(false);
  const [services,         setServices]         = useState<ServiceItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/bookings/services`)
      .then(r => r.ok ? r.json() : [])
      .then((d: ServiceItem[]) => setServices(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [API_BASE]);

  const servicesTotal = useMemo(
    () => services.filter(sv => selectedServices.includes(sv.id)).reduce((acc, sv) => acc + Number(sv.price), 0),
    [services, selectedServices]
  );
  const promoDiscount = promoApplied?.discountAmount ?? 0;
  const grandTotal = Math.max(0, summary.total + servicesTotal - promoDiscount);

  function toggleService(id: string) {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setCheckingPromo(true); setPromoError(null); setPromoApplied(null);
    try {
      const nights = summary.nights || 1;
      const res = await fetch(`${API_BASE}/api/vouchers/validate?code=${encodeURIComponent(promoCode.trim())}&totalAmount=${summary.total + servicesTotal}&nights=${nights}`);
      const data = await res.json();
      if (data.valid) {
        setPromoApplied({ code: promoCode.trim().toUpperCase(), discountAmount: Number(data.discountAmount), name: data.name });
        setPromoError(null);
      } else {
        setPromoError(data.reason ?? "Invalid promo code");
      }
    } catch { setPromoError("Could not validate code. Try again."); }
    finally { setCheckingPromo(false); }
  }

  const imgSrc = summary.imageUrl
    ? (summary.imageUrl.startsWith("http") ? summary.imageUrl : `${API_BASE}/${summary.imageUrl}`)
    : null;

  function fmtCard(v: string) { return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); }
  function fmtExpiry(v: string) { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest.firstName || !guest.lastName || !guest.email) { setError("Please fill in all required fields."); return; }
    if (!card.number || !card.expiry || !card.cvv) { setError("Please fill in all card details."); return; }
    setError(null); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/bookings/direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: summary.roomId, checkIn: summary.checkIn, checkOut: summary.checkOut,
          firstName: guest.firstName, lastName: guest.lastName, email: guest.email, phone: guest.phone,
          cardNumber: card.number.replace(/\s/g, ""), cardExpiry: card.expiry, cardCvv: card.cvv,
          serviceIds: selectedServices,
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? "Booking failed."); }
      const booking = await res.json();
      const p = new URLSearchParams({
        bookingId: String(booking.bookingId),
        guestName: booking.guestName ?? `${guest.firstName} ${guest.lastName}`,
        hotel: booking.hotel ?? summary.hotel,
        room: String(booking.room ?? summary.room),
        checkIn: booking.checkIn ?? summary.checkIn,
        checkOut: booking.checkOut ?? summary.checkOut,
        total: String(booking.total ?? grandTotal),
        email: guest.email,
      });
      router.push(`/book/confirmation?${p.toString()}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally { setLoading(false); }
  }, [guest, card, summary, selectedServices, grandTotal, router, API_BASE]);

  return (
    <div className={s.page}>
      {/* Hero */}
      <div className={s.hero}>
        <div className={s.heroInner}>
          <button type="button" onClick={() => router.push("/book")} className={s.backBtn}>
            <ArrowLeft size={15} /> Back to rooms
          </button>
          <h1 className={s.heroTitle}>Complete your booking</h1>
          <p className={s.heroSub}>Secure checkout — your information is encrypted</p>
        </div>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit}>
        <div className={s.grid}>

          {/* Left column */}
          <div className={s.left}>

            {/* Guest info */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.iconBubble}><User size={18} /></span>
                <div>
                  <p className={s.cardTitle}>Guest Information</p>
                  <p className={s.cardSub}>Fields marked * are required</p>
                </div>
              </div>
              <div className={s.cardBody}>
                <div className={s.fieldGrid2}>
                  <Field label="First Name *" icon={<User size={14}/>} value={guest.firstName}
                    onChange={v => setGuest(g => ({ ...g, firstName: v }))} placeholder="John" />
                  <Field label="Last Name *" icon={<User size={14}/>} value={guest.lastName}
                    onChange={v => setGuest(g => ({ ...g, lastName: v }))} placeholder="Doe" />
                </div>
                <div className={s.fieldGrid2mt}>
                  <Field label="Email *" icon={<Mail size={14}/>} type="email" value={guest.email}
                    onChange={v => setGuest(g => ({ ...g, email: v }))} placeholder="john@example.com" />
                  <Field label="Phone" icon={<Phone size={14}/>} value={guest.phone}
                    onChange={v => setGuest(g => ({ ...g, phone: v }))} placeholder="+1 555 000 0000" />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.iconBubble}><CreditCard size={18} /></span>
                <div>
                  <p className={s.cardTitle}>Payment Details</p>
                  <p className={s.cardSub}><Lock size={11} /> 256-bit SSL encrypted</p>
                </div>
              </div>
              <div className={s.cardBodyFlex}>
                <Field label="Card Number *" icon={<CreditCard size={14}/>} value={card.number}
                  onChange={v => setCard(c => ({ ...c, number: fmtCard(v) }))}
                  placeholder="1234 5678 9012 3456" maxLength={19} />
                <div className={s.fieldGrid2}>
                  <Field label="Expiry (MM/YY) *" icon={<Calendar size={14}/>} value={card.expiry}
                    onChange={v => setCard(c => ({ ...c, expiry: fmtExpiry(v) }))}
                    placeholder="MM/YY" maxLength={5} />
                  <Field label="CVV *" icon={<Lock size={14}/>} type="password" value={card.cvv}
                    onChange={v => setCard(c => ({ ...c, cvv: v.replace(/\D/g, "").slice(0, 4) }))}
                    placeholder="123" maxLength={4} />
                </div>
              </div>
            </div>

            {/* Add-on Services */}
            {services.length > 0 && (
              <div className={s.card}>
                <div className={s.cardHeader}>
                  <span className={s.iconBubble}><ShoppingBag size={18} /></span>
                  <div>
                    <p className={s.cardTitle}>Add-on Services — {summary.hotel}</p>
                    <p className={s.cardSub}>Enhance your stay with extra services</p>
                  </div>
                </div>
                <div className={s.servicesList}>
                  {services.map(sv => {
                    const checked = selectedServices.includes(sv.id);
                    return (
                      <label key={sv.id}
                        className={`${s.serviceItem}${checked ? ` ${s.serviceItemChecked}` : ""}`}>
                        <input type="checkbox" className={s.serviceCheckbox}
                          checked={checked} onChange={() => toggleService(sv.id)} />
                        <div className={s.serviceInfo}>
                          <div className={s.serviceName}>{sv.name}</div>
                          {sv.description && <div className={s.serviceDesc}>{sv.description}</div>}
                        </div>
                        <div className={s.servicePrice}>+€{Number(sv.price).toFixed(2)}</div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {error && <div className={s.errorAlert}>{error}</div>}

            <button type="submit" disabled={loading}
              className={`${s.submitBtn}${loading ? ` ${s.submitBtnDisabled}` : ""}`}>
              <Lock size={16} />
              {loading ? "Processing…" : `Pay €${grandTotal.toFixed(2)} & Confirm Booking`}
            </button>
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
              {summary.type && <span className={s.summaryTypeBadge}>{summary.type}</span>}
              <p className={s.summaryRoomName}>Room {summary.room}</p>
              {summary.hotel && <p className={s.summaryHotel}>{summary.hotel}</p>}
            </div>
            <div className={s.summaryDivider} />
            <div className={s.summaryRows}>
              <SummaryRow icon={<Calendar size={14}/>} label="Check-in"  value={fmtDate(summary.checkIn)} />
              <SummaryRow icon={<Calendar size={14}/>} label="Check-out" value={fmtDate(summary.checkOut)} />
              <SummaryRow icon={<Users size={14}/>}    label="Duration"
                value={`${summary.nights} night${summary.nights !== 1 ? "s" : ""}`} />
            </div>
            <div className={s.summaryDivider} />
            <div className={s.summaryPricing}>
              <div className={s.summaryPriceRow}>
                <span className={s.summaryPriceLabel}>€{summary.price}/night × {summary.nights}</span>
                <span className={s.summaryPriceValue}>€{(summary.price * summary.nights).toFixed(2)}</span>
              </div>
              {servicesTotal > 0 && (
                <div className={s.summaryPriceRow}>
                  <span className={s.summaryPriceLabel}>{t('services')}</span>
                  <span className={s.summaryPriceValue}>+€{servicesTotal.toFixed(2)}</span>
                </div>
              )}
              {promoApplied && (
                <div className={s.summaryPriceRow}>
                  <span className={s.summaryPriceLabel} style={{ color: "#16a34a" }}>🏷️ {promoApplied.name}</span>
                  <span className={s.summaryPriceValue} style={{ color: "#16a34a" }}>-€{promoApplied.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className={s.summaryTotal}>
                <span className={s.summaryTotalLabel}>{t('total')}</span>
                <span className={s.summaryTotalValue}>€{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", icon, maxLength }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ReactNode; maxLength?: number;
}) {
  return (
    <div>
      <label className={s.fieldLabel}>{icon} {label}</label>
      <input className={s.fieldInput} type={type} value={value}
        placeholder={placeholder} maxLength={maxLength}
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
