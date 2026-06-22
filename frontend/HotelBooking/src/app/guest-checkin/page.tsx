"use client";

import { useState } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/GuestCheckin.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type SubmitResult = { confirmationCode: string; status: string; id: string };
type CheckInStatus = { id: string; bookingId: string; status: string; confirmationCode: string; submittedAt: string };

const INIT_FORM = {
    bookingId: "", guestFirstName: "", guestLastName: "", guestEmail: "", guestPhone: "",
    passportNumber: "", nationality: "", address: "",
    earlyCheckIn: false, lateCheckOut: false, extraBed: false, airportTransfer: false,
    specialRequests: "",
};

const STATUS_META: Record<string, { cardCls: string; labelCls: string; icon: string }> = {
    SUBMITTED: { cardCls: s.statusSubmitted, labelCls: s.statusLabelSubmitted, icon: "⏳" },
    REVIEWED:  { cardCls: s.statusReviewed,  labelCls: s.statusLabelReviewed,  icon: "👁️" },
    APPROVED:  { cardCls: s.statusApproved,  labelCls: s.statusLabelApproved,  icon: "✅" },
    REJECTED:  { cardCls: s.statusRejected,  labelCls: s.statusLabelRejected,  icon: "❌" },
};

const CHECKBOX_OPTS = [
    { key: "earlyCheckIn",    labelKey: "earlyCheckIn",    icon: "🌅" },
    { key: "lateCheckOut",    labelKey: "lateCheckOut",    icon: "🌙" },
    { key: "extraBed",        labelKey: "extraBed",        icon: "🛏️" },
    { key: "airportTransfer", labelKey: "airportTransfer", icon: "✈️" },
];

export default function GuestCheckInPage() {
  const { t } = useTranslation();
    const [tab,           setTab]           = useState<"checkin" | "status">("checkin");
    const [form,          setForm]          = useState<typeof INIT_FORM>(INIT_FORM);
    const [submitting,    setSubmitting]    = useState(false);
    const [result,        setResult]        = useState<SubmitResult | null>(null);
    const [statusEmail,   setStatusEmail]   = useState("");
    const [statusList,    setStatusList]    = useState<CheckInStatus[]>([]);
    const [statusLoading, setStatusLoading] = useState(false);

    const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

    const submit = async () => {
        if (!form.bookingId || !form.guestFirstName || !form.guestLastName || !form.guestEmail) {
            alert("Booking ID, name, and email are required.");
            return;
        }
        setSubmitting(true);
        try {
            const r = await api.post("/api/public/online-checkin", form);
            setResult(r.data);
        } catch { alert("Submission failed. Please check your booking ID and try again."); }
        finally { setSubmitting(false); }
    };

    const lookupStatus = async () => {
        if (!statusEmail) return;
        setStatusLoading(true);
        try {
            const r = await api.get(`/api/public/online-checkin/status?email=${encodeURIComponent(statusEmail)}`);
            setStatusList(r.data);
        } catch { alert("Status lookup failed."); }
        finally { setStatusLoading(false); }
    };

    return (
        <div className={s.page}>
            <div className={s.container}>
                {/* Header */}
                <div className={s.heroHeader}>
                    <div className={s.heroIcon}>🏨</div>
                    <h1 className={s.heroTitle}>{t('onlineSelfCheckIn')}</h1>
                    <p className={s.heroSub}>{t('checkInFormSubtitle')}</p>
                </div>

                {/* Card */}
                <div className={s.card}>
                    {/* Tabs */}
                    <div className={s.tabs}>
                        {(["checkin", "status"] as const).map(tabKey => (
                            <button
                                type="button"
                                key={tabKey}
                                className={`${s.tabBtn} ${tab === tabKey ? s.tabBtnActive : ""}`}
                                onClick={() => { setTab(tabKey); setResult(null); }}
                            >
                                {tabKey === "checkin" ? t('checkInFormTab') : t('checkStatusTab')}
                            </button>
                        ))}
                    </div>

                    {/* Check-in form */}
                    {tab === "checkin" && !result && (
                        <div className={s.formFields}>
                            <div>
                                <label className={s.fieldLabel} htmlFor="ci-booking">{t('bookingReference')}</label>
                                <input id="ci-booking" className={s.fieldInput} value={form.bookingId}
                                    onChange={e => set("bookingId", e.target.value)} placeholder="Your booking UUID" />
                            </div>
                            <div className={s.row2}>
                                <div>
                                    <label className={s.fieldLabel} htmlFor="ci-first">{t('firstName')} *</label>
                                    <input id="ci-first" className={s.fieldInput} value={form.guestFirstName}
                                        onChange={e => set("guestFirstName", e.target.value)} placeholder="First name" />
                                </div>
                                <div>
                                    <label className={s.fieldLabel} htmlFor="ci-last">{t('lastName')} *</label>
                                    <input id="ci-first" className={s.fieldInput} value={form.guestLastName}
                                        onChange={e => set("guestLastName", e.target.value)} placeholder="Last name" />
                                </div>
                            </div>
                            <div className={s.row2}>
                                <div>
                                    <label className={s.fieldLabel} htmlFor="ci-email">{t('emailAddress')} *</label>
                                    <input id="ci-email" type="email" className={s.fieldInput} value={form.guestEmail}
                                        onChange={e => set("guestEmail", e.target.value)} placeholder="your@email.com" />
                                </div>
                                <div>
                                    <label className={s.fieldLabel} htmlFor="ci-phone">{t('phone')}</label>
                                    <input id="ci-phone" type="tel" className={s.fieldInput} value={form.guestPhone}
                                        onChange={e => set("guestPhone", e.target.value)} placeholder="+1 555 000 0000" />
                                </div>
                            </div>
                            <div className={s.row2}>
                                <div>
                                    <label className={s.fieldLabel} htmlFor="ci-passport">{t('passportIdNumber')}</label>
                                    <input id="ci-passport" className={s.fieldInput} value={form.passportNumber}
                                        onChange={e => set("passportNumber", e.target.value)} placeholder="AB1234567" />
                                </div>
                                <div>
                                    <label className={s.fieldLabel} htmlFor="ci-nat">{t('nationality')}</label>
                                    <input id="ci-nat" className={s.fieldInput} value={form.nationality}
                                        onChange={e => set("nationality", e.target.value)} placeholder="e.g. Georgian" />
                                </div>
                            </div>
                            <div>
                                <label className={s.fieldLabel} htmlFor="ci-address">{t('homeAddress')}</label>
                                <input id="ci-address" className={s.fieldInput} value={form.address}
                                    onChange={e => set("address", e.target.value)} placeholder="Street, City, Country" />
                            </div>
                            <div>
                                <span className={s.optionsLabel}>{t('addOnsRequests')}</span>
                                <div className={s.optionsGrid}>
                                    {CHECKBOX_OPTS.map(({ key, labelKey, icon }) => (
                                        <label
                                            key={key}
                                            className={`${s.checkOption} ${(form as Record<string, boolean | string>)[key] ? s.checkOptionActive : ""}`}
                                        >
                                            <input
                                                type="checkbox"
                                                className={s.checkOptionInput}
                                                checked={!!(form as Record<string, boolean | string>)[key]}
                                                onChange={e => set(key, e.target.checked)}
                                            />
                                            {icon} {t(labelKey)}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={s.fieldLabel} htmlFor="ci-requests">{t('otherRequests')}</label>
                                <textarea
                                    id="ci-requests"
                                    className={`${s.fieldInput} ${s.fieldTextarea}`}
                                    value={form.specialRequests}
                                    onChange={e => set("specialRequests", e.target.value)}
                                    placeholder="Any other special requests or notes…"
                                />
                            </div>
                            <button type="button" className={s.submitBtn} onClick={submit} disabled={submitting}>
                                {submitting ? t('submittingReview') : t('completeOnlineCheckIn')}
                            </button>
                        </div>
                    )}

                    {/* Success */}
                    {tab === "checkin" && result && (
                        <div className={s.successState}>
                            <div className={s.successIcon}>✅</div>
                            <h2 className={s.successTitle}>{t('checkInSubmitted')}</h2>
                            <p className={s.successText}>{t('checkInSubmittedText')}</p>
                            <div className={s.confirmationBox}>
                                <div className={s.confirmationLabel}>{t('confirmationCode')}</div>
                                <div className={s.confirmationCode}>{result.confirmationCode}</div>
                            </div>
                            <p className={s.successHint}>Save this code. Check your status using your email below.</p>
                            <button type="button" className={s.anotherBtn} onClick={() => { setResult(null); setForm(INIT_FORM); }}>
                                {t('submitAnother')}
                            </button>
                        </div>
                    )}

                    {/* Status lookup */}
                    {tab === "status" && (
                        <div>
                            <div className={s.statusRow}>
                                <input
                                    type="email"
                                    className={s.statusInput}
                                    value={statusEmail}
                                    onChange={e => setStatusEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    onKeyDown={e => { if (e.key === "Enter") lookupStatus(); }}
                                />
                                <button type="button" className={s.checkBtn} onClick={lookupStatus}
                                    disabled={statusLoading || !statusEmail}>
                                    {statusLoading ? "…" : "Check"}
                                </button>
                            </div>
                            {statusList.length === 0 && statusEmail && !statusLoading && (
                                <div className={s.noResults}>{t('noCheckInsForEmail', 'No check-ins found for this email.')}</div>
                            )}
                            {statusList.map(item => {
                                const meta = STATUS_META[item.status] ?? STATUS_META.SUBMITTED;
                                return (
                                    <div key={item.id} className={`${s.statusCard} ${meta.cardCls}`}>
                                        <div>
                                            <div className={s.statusBookingId}>Booking {item.bookingId?.substring(0, 8)}…</div>
                                            <div className={s.statusCode}>{item.confirmationCode}</div>
                                            {item.submittedAt && (
                                                <div className={s.statusDate}>
                                                    Submitted {new Date(item.submittedAt).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                        <div className={s.statusIconBlock}>
                                            <div className={s.statusEmoji}>{meta.icon}</div>
                                            <div className={meta.labelCls}>{item.status}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className={s.footer}>Powered by LuxStay Hotel Management System</div>
            </div>
        </div>
    );
}
