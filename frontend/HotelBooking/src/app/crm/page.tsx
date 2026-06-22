"use client";

import { useState, useEffect } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/CRM.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Guest = { id: string; firstName: string; lastName: string; email: string; phone?: string; nationality?: string };
type Communication = { id: string; type: string; subject: string; body: string; staffMember: string; contactedAt: string };
type Booking = { id: string; checkIn: string; checkOut: string; totalPrice: number; status: string };

type GuestProfile = {
    guest: Guest;
    bookings: Booking[];
    communications: Communication[];
    loyaltyPoints?: number;
    loyaltyTier?: string;
};

type Segment = { total: number; vip: number; newGuests: number };

const COMM_TYPES = ["EMAIL", "PHONE_CALL", "SMS", "IN_PERSON", "WHATSAPP", "NOTE"];

const COMM_ICON: Record<string, string> = {
    EMAIL: "✉️", PHONE_CALL: "📞", SMS: "💬", IN_PERSON: "🤝", WHATSAPP: "📱", NOTE: "📝",
};

const TIER_CLS: Record<string, string> = {
    BRONZE: s.tierBronze, SILVER: s.tierSilver, GOLD: s.tierGold, PLATINUM: s.tierPlatinum,
};

const INIT_LOG = { type: "NOTE", subject: "", body: "", staffMember: "" };

export default function CrmPage() {
  const { t } = useTranslation();
    const [guests,       setGuests]       = useState<Guest[]>([]);
    const [selected,     setSelected]     = useState<Guest | null>(null);
    const [profile,      setProfile]      = useState<GuestProfile | null>(null);
    const [segment,      setSegment]      = useState<Segment | null>(null);
    const [search,       setSearch]       = useState("");
    const [loading,      setLoading]      = useState(false);
    const [showLog,      setShowLog]      = useState(false);
    const [logForm,      setLogForm]      = useState(INIT_LOG);
    const [saving,       setSaving]       = useState(false);

    useEffect(() => {
        api.get("/api/guests").then(r => setGuests(r.data)).catch(() => setGuests([]));
        api.get("/api/crm/segments").then(r => setSegment(r.data)).catch(() => {});
    }, []);

    const selectGuest = async (g: Guest) => {
        setSelected(g);
        setProfile(null);
        setLoading(true);
        try {
            const r = await api.get(`/api/crm/guests/${g.id}/profile`);
            setProfile(r.data);
        } catch { setProfile({ guest: g, bookings: [], communications: [] }); }
        finally { setLoading(false); }
    };

    const logCommunication = async () => {
        if (!selected || !logForm.subject || !logForm.staffMember) return;
        setSaving(true);
        try {
            await api.post("/api/crm/communications", {
                guestId: selected.id,
                guestEmail: selected.email,
                guestName: `${selected.firstName} ${selected.lastName}`,
                ...logForm,
            });
            setShowLog(false);
            setLogForm(INIT_LOG);
            selectGuest(selected);
        } catch { alert("Failed to log communication"); }
        finally { setSaving(false); }
    };

    const filtered = guests.filter(g =>
        `${g.firstName} ${g.lastName} ${g.email}`.toLowerCase().includes(search.toLowerCase())
    );

    const totalSpent = profile?.bookings.reduce((acc, b) => acc + (b.totalPrice || 0), 0) ?? 0;

    return (
        <div className={s.layout}>
            {/* Left panel — guest list */}
            <div className={s.sidePanel}>
                <div className={s.sidePanelHead}>
                    <h2 className={s.sidePanelTitle}>{t('guestCrm')}</h2>
                    {segment && (
                        <div className={s.segmentRow}>
                            <span className={`${s.segPill} ${s.segTotal}`}>{t('total')}: {segment.total}</span>
                            <span className={`${s.segPill} ${s.segVip}`}>{t('vip')}: {segment.vip}</span>
                            <span className={`${s.segPill} ${s.segNew}`}>{t('newGuests')}: {segment.newGuests}</span>
                        </div>
                    )}
                    <input
                        className={s.searchInput}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('searchGuests3')}
                    />
                </div>

                <div className={s.guestList}>
                    {filtered.map(g => (
                        <div
                            key={g.id}
                            className={`${s.guestItem} ${selected?.id === g.id ? s.guestItemActive : ""}`}
                            onClick={() => selectGuest(g)}
                        >
                            <div className={s.guestName}>{g.firstName} {g.lastName}</div>
                            <div className={s.guestEmail}>{g.email}</div>
                            {g.nationality && <div className={s.guestNat}>{g.nationality}</div>}
                        </div>
                    ))}
                    {filtered.length === 0 && <div className={s.listEmpty}>{t('noGuestsFound')}</div>}
                </div>
            </div>

            {/* Right panel — profile */}
            <div className={s.mainPanel}>
                {!selected && (
                    <div className={s.emptyState}>
                        <div className={s.emptyIcon}>👤</div>
                        <div className={s.emptyText}>{t('selectGuestProfile')}</div>
                    </div>
                )}

                {selected && loading && (
                    <div className="state-container">
                        <div className="spinner" />
                        <p className="state-sub">{t('loadingProfile')}</p>
                    </div>
                )}

                {selected && !loading && profile && (
                    <div>
                        {/* Profile header */}
                        <div className={s.profileHeader}>
                            <div className={s.avatarRow}>
                                <div className={s.avatar}>
                                    {profile.guest.firstName?.[0]}{profile.guest.lastName?.[0]}
                                </div>
                                <div>
                                    <h2 className={s.guestFullName}>
                                        {profile.guest.firstName} {profile.guest.lastName}
                                    </h2>
                                    <div className={s.guestContact}>{profile.guest.email}</div>
                                    {profile.guest.phone && (
                                        <div className={s.guestContact}>{profile.guest.phone}</div>
                                    )}
                                </div>
                                {profile.loyaltyTier && (
                                    <span className={`${s.tierBadge} ${TIER_CLS[profile.loyaltyTier] ?? s.tierDefault}`}>
                                        {profile.loyaltyTier} · {profile.loyaltyPoints ?? 0} pts
                                    </span>
                                )}
                            </div>
                            <button type="button" className={s.logBtn} onClick={() => setShowLog(true)}>
                                + {t('logContact')}
                            </button>
                        </div>

                        {/* Quick stats */}
                        <div className={s.statsRow}>
                            <div className={s.statBox}>
                                <div className={s.statBoxValue}>{profile.bookings.length}</div>
                                <div className={s.statBoxLabel}>{t('totalStays')}</div>
                            </div>
                            <div className={s.statBox}>
                                <div className={s.statBoxValue}>€{totalSpent.toFixed(2)}</div>
                                <div className={s.statBoxLabel}>{t('totalSpent')}</div>
                            </div>
                            <div className={s.statBox}>
                                <div className={s.statBoxValue}>{profile.communications.length}</div>
                                <div className={s.statBoxLabel}>{t('contactsLogged')}</div>
                            </div>
                        </div>

                        {/* Detail grid */}
                        <div className={s.detailGrid}>
                            {/* Booking history */}
                            <div>
                                <div className={s.sectionTitle}>{t('bookingHistory')}</div>
                                {profile.bookings.length === 0 && <div className={s.noItems}>{t('noBookingsYet')}</div>}
                                {profile.bookings.map(b => (
                                    <div key={b.id} className={s.bookingCard}>
                                        <div className={s.bookingCardTop}>
                                            <span className={s.bookingDates}>{b.checkIn} → {b.checkOut}</span>
                                            <span className={`${s.statusPill} ${b.status === "CONFIRMED" ? s.statusConfirmed : s.statusDefault}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <div className={s.bookingPrice}>€{b.totalPrice}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Communication log */}
                            <div>
                                <div className={s.sectionTitle}>{t('communicationLog')}</div>
                                {profile.communications.length === 0 && <div className={s.noItems}>{t('noCommunicationsYet')}</div>}
                                {profile.communications.map(c => (
                                    <div key={c.id} className={s.commCard}>
                                        <div className={s.commCardTop}>
                                            <span className={s.commIcon}>{COMM_ICON[c.type] ?? "📌"}</span>
                                            <span className={s.commSubject}>{c.subject}</span>
                                        </div>
                                        {c.body && <div className={s.commBody}>{c.body}</div>}
                                        <div className={s.commMeta}>
                                            {c.staffMember} · {new Date(c.contactedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Log communication modal */}
            {showLog && (
                <div className={s.overlay}>
                    <div className={s.modal}>
                        <h3 className={s.modalTitle}>{t('logCommunicationTitle')}</h3>
                        <div className={s.formFields}>
                            <div>
                                <label className={s.fieldLabel} htmlFor="comm-type">{t('type')}</label>
                                <select
                                    id="comm-type"
                                    className={s.fieldControl}
                                    value={logForm.type}
                                    onChange={e => setLogForm(f => ({ ...f, type: e.target.value }))}
                                >
                                    {COMM_TYPES.map(ct => <option key={ct} value={ct}>{ct.replace("_", " ")}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={s.fieldLabel} htmlFor="comm-subject">{t('subjectLabel')} *</label>
                                <input
                                    id="comm-subject"
                                    className={s.fieldControl}
                                    value={logForm.subject}
                                    onChange={e => setLogForm(f => ({ ...f, subject: e.target.value }))}
                                    placeholder={t('subjectLabel')}
                                />
                            </div>
                            <div>
                                <label className={s.fieldLabel} htmlFor="comm-body">{t('notes')}</label>
                                <textarea
                                    id="comm-body"
                                    className={`${s.fieldControl} ${s.fieldTextarea}`}
                                    value={logForm.body}
                                    onChange={e => setLogForm(f => ({ ...f, body: e.target.value }))}
                                    placeholder={t('notes')}
                                />
                            </div>
                            <div>
                                <label className={s.fieldLabel} htmlFor="comm-staff">{t('staffMemberLabel')} *</label>
                                <input
                                    id="comm-staff"
                                    className={s.fieldControl}
                                    value={logForm.staffMember}
                                    onChange={e => setLogForm(f => ({ ...f, staffMember: e.target.value }))}
                                    placeholder={t('yourName')}
                                />
                            </div>
                        </div>
                        <div className={s.modalActions}>
                            <button type="button" className={s.cancelBtn} onClick={() => setShowLog(false)}>
                                {t('cancel')}
                            </button>
                            <button type="button" className={s.saveBtn} onClick={logCommunication} disabled={saving}>
                                {saving ? t('savingDots') : t('logContact')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
