"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { CreditCard, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Money = number | string;
const toNumber = (v: Money | undefined | null) =>
  typeof v === "number" ? (isFinite(v) ? v : 0) :
  typeof v === "string" ? (isFinite(+v) ? +v : 0) : 0;

type Booking = { id: string; code?: string; guestName?: string; checkInDate?: string; checkOutDate?: string; totalAmount?: Money };

const PAYMENT_METHODS = [
  { value: "MASTERCARD", label: "Mastercard" },
  { value: "VISA",       label: "Visa" },
  { value: "CASH",       label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

export default function AddPayment() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookings,       setBookings]       = useState<Booking[]>([]);
  const [bookingId,      setBookingId]      = useState(searchParams.get("bookingId") ?? "");
  const [amount,         setAmount]         = useState("");
  const [paymentMethod,  setPaymentMethod]  = useState("");
  const [paymentDate,    setPaymentDate]    = useState(() => new Date().toISOString().split("T")[0]);
  const [status,         setStatus]         = useState("PENDING");
  const [cardNumber,     setCardNumber]     = useState("");
  const [expiry,         setExpiry]         = useState("");
  const [cvv,            setCvv]            = useState("");
  const [totalInfo,      setTotalInfo]      = useState("");

  const [loading,    setLoading]    = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/bookings")
      .then(r => { const d = r.data; setBookings(Array.isArray(d) ? d : (d?.content ?? [])); })
      .catch((e) => console.error('Failed to load dropdown data:', e));
  }, []);

  useEffect(() => {
    if (!bookingId) { setAmount(""); setTotalInfo(""); return; }
    let alive = true;
    async function fetchTotal() {
      try {
        const fromList = bookings.find(b => b.id === bookingId);
        let total = toNumber(fromList?.totalAmount);
        if (!total) {
          const res = await api.get(`/api/bookings/${bookingId}`);
          total = toNumber(res.data?.totalAmount);
        }
        if (!alive) return;
        const n = Number.isFinite(total) ? total : 0;
        setAmount(n.toFixed(2));
        setTotalInfo(`Booking total: $${n.toFixed(2)}`);
      } catch { if (alive) setTotalInfo("Could not load booking total."); }
    }
    fetchTotal();
    return () => { alive = false; };
  }, [bookingId, bookings]);

  function handleMethodChange(value: string) {
    setPaymentMethod(value);
    setStatus(value === "CASH" ? "PAID" : "PENDING");
  }

  const needsCardDetails = paymentMethod === "MASTERCARD" || paymentMethod === "VISA";
  const preselectedMissing = !!bookingId && !bookings.some(b => b.id === bookingId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await api.post("/api/payments", {
        bookingId,
        amount: parseFloat(amount || "0"),
        paymentMethod,
        paymentDate,
        status,
        // Only the card number is sent, and only its last four digits are kept
        // server-side. The expiry and CVV never leave the browser.
        cardNumber: needsCardDetails ? cardNumber : undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push("/payments"), 1400);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to add payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('addPaymentTitle')}</h1>
          <p className="page-subtitle">{t('addPaymentSubtitle')}</p>
        </div>
        <Link href="/payments" className="btn btn-secondary">
          <ArrowLeft size={14} /> {t('backToPayments')}
        </Link>
      </div>

      <div className="form-card">
        <div className="form-header">
          <div className="avatar-sm"><CreditCard size={14} /></div>
          <div className="form-header-text">
            <p className="form-heading">{t('paymentDetails')}</p>
            <p className="form-subheading">{t('allFieldsRequired')}</p>
          </div>
        </div>

        {success && (
          <div className="feedback-success">
            <CheckCircle size={15} /> {t('paymentRecordedSuccess')}
          </div>
        )}
        {error && (
          <div className="feedback-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-field">
            <label className="form-label" htmlFor="p-booking">{t('bookingLabel')}</label>
            <select id="p-booking" className="form-select" value={bookingId} onChange={e => setBookingId(e.target.value)} required>
              <option value="">{t('selectBooking')}</option>
              {preselectedMissing && <option value={bookingId}>(selected booking)</option>}
              {bookings.map(b => {
                const ci = b.checkInDate?.slice(0, 10) ?? "";
                const co = b.checkOutDate?.slice(0, 10) ?? "";
                return (
                  <option key={b.id} value={b.id}>
                    {b.code ?? "Booking"} | {b.guestName ?? "Guest"} | {ci} → {co}
                  </option>
                );
              })}
            </select>
            {totalInfo && <p className="form-hint">{totalInfo}</p>}
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="p-amount">{t('amountUsd')}</label>
              <input id="p-amount" className="form-input" type="number" step="0.01" min="0"
                value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="p-date">{t('paymentDate2')}</label>
              <input id="p-date" className="form-input" type="date"
                value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="p-method">{t('paymentMethod2')}</label>
              <select id="p-method" className="form-select" value={paymentMethod}
                onChange={e => handleMethodChange(e.target.value)} required>
                <option value="">{t('selectMethod')}</option>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="p-status">{t('status')}</label>
              <select id="p-status" className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="PENDING">{t('pending')}</option>
                <option value="PAID">{t('paid')}</option>
                <option value="CANCELLED">{t('cancelled')}</option>
              </select>
            </div>
          </div>

          {needsCardDetails && (
            <div className="card-details-box">
              <p className="form-label">{t('cardDetails')}</p>
              <div className="form-field">
                <label className="form-label" htmlFor="p-card">{t('cardNumber')}</label>
                <input id="p-card" className="form-input" type="text" maxLength={19}
                  placeholder="**** **** **** ****"
                  value={cardNumber} onChange={e => setCardNumber(e.target.value)} required />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label" htmlFor="p-exp">{t('expiry')}</label>
                  <input id="p-exp" className="form-input" type="text" placeholder="08/26"
                    value={expiry} onChange={e => setExpiry(e.target.value)} required />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="p-cvv">{t('cvv')}</label>
                  <input id="p-cvv" className="form-input" type="password" maxLength={3}
                    placeholder="***"
                    value={cvv} onChange={e => setCvv(e.target.value)} required />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="form-button" disabled={loading || success}>
            {loading ? t('processingPayment') : t('submitPayment')}
          </button>
        </form>
      </div>
    </div>
  );
}
