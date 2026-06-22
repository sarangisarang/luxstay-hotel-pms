"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, Lock, Eye, EyeOff, CheckCircle, Star, ClipboardList } from "lucide-react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/Profile.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Profile = { id: string; email: string; role: string };
type Loyalty = { points: number; tier: string; totalStays: number; totalSpent: number };
type Booking = { id: string; checkInDate: string; checkOutDate: string; bookingStatus: string; totalAmount: number; roomNumber?: number };

const TIER_ICON: Record<string, string> = {
    PLATINUM: "💎", GOLD: "🥇", SILVER: "🥈", BRONZE: "🥉",
};
const TIER_CLASS: Record<string, string> = {
    PLATINUM: "tierPlatinum", GOLD: "tierGold", SILVER: "tierSilver", BRONZE: "tierBronze",
};
const ROLE_PILL_CLASS: Record<string, string> = {
    ADMIN: "rolePillAdmin", RECEPTION: "rolePillReception", USER: "rolePillUser",
};
const STATUS_BADGE_CLASS: Record<string, string> = {
    CONFIRMED: "statusConfirmed", CHECKED_IN: "statusCheckedIn", CHECKED_OUT: "statusCheckedOut",
    COMPLETED: "statusCompleted", CANCELLED: "statusCancelled",  PENDING: "statusPending",
};

function fmt(n: number) {
    return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n ?? 0);
}

export default function ProfilePage() {
  const { t } = useTranslation();
    const router = useRouter();

    const [profile,  setProfile]  = useState<Profile | null>(null);
    const [loadError,setLoadError]= useState<string | null>(null);
    const [loyalty,  setLoyalty]  = useState<Loyalty | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);

    const [current,     setCurrent]     = useState("");
    const [newPass,     setNewPass]     = useState("");
    const [confirm,     setConfirm]     = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew,     setShowNew]     = useState(false);
    const [saving,      setSaving]      = useState(false);
    const [pwError,     setPwError]     = useState<string | null>(null);
    const [pwSuccess,   setPwSuccess]   = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }

        api.get("/api/user/me")
            .then(r => {
                const p: Profile = r.data;
                setProfile(p);
                // Fetch loyalty by email — 404 is expected if guest has no loyalty record
                if (p.role === "USER") {
                    api.get(`/api/loyalty/email/${encodeURIComponent(p.email)}`)
                        .then(lr => setLoyalty(lr.data))
                        .catch(() => {});
                    // Fetch recent bookings for guests only
                    api.get(`/api/public/bookings/my-bookings?email=${encodeURIComponent(p.email)}`)
                        .then(br => setBookings(Array.isArray(br.data) ? br.data.slice(0, 5) : []))
                        .catch(() => {});
                }
            })
            .catch(() => {
                localStorage.removeItem("token");
                router.push("/login");
            });
    }, [router]);

    async function changePassword(e: React.FormEvent) {
        e.preventDefault();
        setPwError(null); setPwSuccess(false);
        if (newPass !== confirm) { setPwError(t('passwordMismatch')); return; }
        if (newPass.length < 8)  { setPwError(t('passwordTooShort')); return; }

        setSaving(true);
        try {
            await api.post("/api/user/change-password", { currentPassword: current, newPassword: newPass });
            setPwSuccess(true);
            setCurrent(""); setNewPass(""); setConfirm("");
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setPwError(msg ?? "Request failed. Try again.");
        } finally { setSaving(false); }
    }

    if (loadError) return <div className={s.errorWrap}>{loadError}</div>;
    if (!profile)  return <div className={s.stateWrap}>{t('loading')}</div>;

    return (
        <div className={s.wrapper}>

            {/* Profile card */}
            <div className={s.card}>
                <div className={s.cardHeader}>
                    <div className={s.headerIcon}><User size={26} color="white" /></div>
                    <div>
                        <p className={s.headerTitle}>{t('myProfile')}</p>
                        <p className={s.headerSub}>{t('accountSettingsSecurity')}</p>
                    </div>
                </div>
                <div className={s.cardBody}>
                    <div className={s.infoRow}>
                        <span className={s.infoLabel}><Mail size={16} /> {t('emailLabel')}</span>
                        <span className={s.infoValue}>{profile.email}</span>
                    </div>
                    <div className={s.infoRow}>
                        <span className={s.infoLabel}><Shield size={16} /> {t('roleLabel')}</span>
                        <span className={`${s.rolePill} ${s[ROLE_PILL_CLASS[profile.role] ?? "rolePillDefault"]}`}>
                            {profile.role}
                        </span>
                    </div>
                </div>
            </div>

            {/* Loyalty card */}
            {loyalty && (
                <div className={s.card}>
                    <div className={s.loyaltyHeader}>
                        <div className={s.loyaltyIconWrap}><Star size={16} color="#d97706" /></div>
                        <div>
                            <p className={s.loyaltyTitle}>{t('loyaltyStatus')}</p>
                            <p className={s.loyaltySub}>{loyalty.points.toLocaleString()} {t('pointsEarned')}</p>
                        </div>
                    </div>
                    <div className={s.loyaltyBody}>
                        <div className={s.tierBadge}>
                            <span className={s.tierIcon}>{TIER_ICON[loyalty.tier] ?? "🥉"}</span>
                            <span className={`${s.tierName} ${s[TIER_CLASS[loyalty.tier] ?? "tierBronze"]}`}>
                                {loyalty.tier}
                            </span>
                        </div>
                        <div className={s.loyaltyStats}>
                            <div className={s.loyaltyStat}>
                                <span>{t('points')}</span>
                                <span className={s.loyaltyStatVal}>{loyalty.points.toLocaleString()}</span>
                            </div>
                            <div className={s.loyaltyStat}>
                                <span>{t('totalStays')}</span>
                                <span className={s.loyaltyStatVal}>{loyalty.totalStays}</span>
                            </div>
                            <div className={s.loyaltyStat}>
                                <span>{t('totalSpent')}</span>
                                <span className={s.loyaltyStatVal}>{fmt(loyalty.totalSpent)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent bookings card */}
            {bookings.length > 0 && (
                <div className={s.card}>
                    <div className={s.bkHeader}>
                        <div className={s.bkIconWrap}><ClipboardList size={16} color="#2563eb" /></div>
                        <div>
                            <p className={s.bkTitle}>{t('recentBookings3')}</p>
                        </div>
                    </div>
                    <div className={s.bkBody}>
                        <table className="ui-table">
                            <thead>
                                <tr>
                                    <th>{t('refLabel')}</th>
                                    <th>{t('checkIn')}</th>
                                    <th>{t('checkOut')}</th>
                                    <th>{t('status')}</th>
                                    <th>{t('amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map(b => (
                                    <tr key={b.id}>
                                        <td className="cell-mono">{b.id.substring(0, 8).toUpperCase()}</td>
                                        <td>{b.checkInDate}</td>
                                        <td>{b.checkOutDate}</td>
                                        <td>
                                            <span className={`${s.statusBadge} ${s[STATUS_BADGE_CLASS[b.bookingStatus] ?? "statusDefault"]}`}>
                                                {b.bookingStatus}
                                            </span>
                                        </td>
                                        <td className="cell-mono">{fmt(b.totalAmount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Change password card */}
            <div className={s.card}>
                <div className={s.pwHeader}>
                    <div className={s.pwIconWrap}><Lock size={16} color="#4f46e5" /></div>
                    <div>
                        <p className={s.pwTitle}>{t('changePassword')}</p>
                        <p className={s.pwSub}>{t('minimumChars')}</p>
                    </div>
                </div>
                <form onSubmit={changePassword} className={s.pwForm}>
                    <PasswordField id="current-pw" label={t('currentPassword')} value={current} onChange={setCurrent}
                        show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
                    <PasswordField id="new-pw" label={t('newPassword')} value={newPass} onChange={setNewPass}
                        show={showNew} onToggle={() => setShowNew(v => !v)} />
                    <PasswordField id="confirm-pw" label={t('confirmNewPassword')} value={confirm} onChange={setConfirm}
                        show={showNew} onToggle={() => setShowNew(v => !v)} />

                    {pwError && <div className={s.alertError}>{pwError}</div>}
                    {pwSuccess && (
                        <div className={s.alertSuccess}>
                            <CheckCircle size={16} /> {t('passwordChangedSuccess')}
                        </div>
                    )}

                    <button type="submit" disabled={saving} className={s.submitBtn}>
                        {saving ? t('working') : t('changePassword')}
                    </button>
                </form>
            </div>
        </div>
    );
}

function PasswordField({ id, label, value, onChange, show, onToggle }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void;
}) {
    return (
        <div>
            <label htmlFor={id} className={s.fieldLabel}>{label}</label>
            <div className={s.fieldWrap}>
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    required
                    className={s.fieldInput}
                />
                <button type="button" onClick={onToggle} className={s.fieldToggle} aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );
}
