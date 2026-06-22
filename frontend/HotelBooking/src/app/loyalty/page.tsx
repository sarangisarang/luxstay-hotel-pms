"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/Loyalty.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Member = {
    id: string;
    guestName: string;
    guestEmail: string;
    points: number;
    tier: string;
    totalStays: number;
    totalSpent: number;
    updatedAt: string;
};

type Stats = {
    totalMembers: number;
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
};

const TIER_EMOJI: Record<string, string> = {
    BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇", PLATINUM: "💎",
};

const TIER_THRESHOLDS = [
    { tier: "BRONZE",   cls: s.tierCardBronze,   nameCls: s.tierCardNameBronze,   range: "0 – 1,499 pts" },
    { tier: "SILVER",   cls: s.tierCardSilver,   nameCls: s.tierCardNameSilver,   range: "1,500 – 4,999 pts" },
    { tier: "GOLD",     cls: s.tierCardGold,     nameCls: s.tierCardNameGold,     range: "5,000 – 9,999 pts" },
    { tier: "PLATINUM", cls: s.tierCardPlatinum, nameCls: s.tierCardNamePlatinum, range: "10,000+ pts" },
];

const TIER_BADGE_CLS: Record<string, string> = {
    BRONZE: s.tierBronze, SILVER: s.tierSilver, GOLD: s.tierGold, PLATINUM: s.tierPlatinum,
};

const STAT_VALUE_CLS: Record<string, string> = {
    total: s.statValueTotal, BRONZE: s.statValueBronze, SILVER: s.statValueSilver,
    GOLD: s.statValueGold, PLATINUM: s.statValuePlatinum,
};

const AWARD_FIELDS: { labelKey: string; name: string; type?: string }[] = [
    { labelKey: "awardGuestId",       name: "guestId" },
    { labelKey: "awardGuestEmail",    name: "guestEmail" },
    { labelKey: "awardGuestName",     name: "guestName" },
    { labelKey: "awardPointsToField", name: "points",      type: "number" },
    { labelKey: "awardAmountSpent",   name: "amountSpent", type: "number" },
];

const INIT_AWARD = { guestId: "", guestEmail: "", guestName: "", points: "100", amountSpent: "" };

export default function LoyaltyPage() {
  const { t } = useTranslation();
    const [members,      setMembers]      = useState<Member[]>([]);
    const [stats,        setStats]        = useState<Stats | null>(null);
    const [loading,      setLoading]      = useState(true);
    const [filterTier,   setFilterTier]   = useState("ALL");
    const [redeemInput,  setRedeemInput]  = useState<Record<string, string>>({});
    const [awardForm,    setAwardForm]    = useState<Record<string, string>>(INIT_AWARD);
    const [showAward,    setShowAward]    = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([api.get("/api/loyalty"), api.get("/api/loyalty/stats")])
            .then(([m, st]) => { setMembers(m.data); setStats(st.data); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const redeem = async (id: string) => {
        const pts = parseInt(redeemInput[id] ?? "0");
        if (!pts) return;
        try {
            await api.patch(`/api/loyalty/${id}/redeem`, { points: pts });
            load();
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            alert(msg ?? "Redemption failed");
        }
    };

    const award = async () => {
        try {
            await api.post("/api/loyalty/award", {
                ...awardForm,
                points: parseInt(awardForm.points),
                countStay: false,
                amountSpent: awardForm.amountSpent ? parseFloat(awardForm.amountSpent) : null,
            });
            setShowAward(false);
            setAwardForm(INIT_AWARD);
            load();
        } catch { alert("Failed to award points"); }
    };

    const filtered = filterTier === "ALL" ? members : members.filter(m => m.tier === filterTier);

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingLoyalty')}</p></div>
    );

    return (
        <div className="page-wrapper fade-in">
            {/* Header */}
            <div className={s.header}>
                <h1 className={s.title}>{t('guestLoyaltyProgram', 'Guest Loyalty Program')}</h1>
                <button type="button" className={s.awardBtn} onClick={() => setShowAward(true)}>+ {t('awardPoints')}</button>
            </div>

            {/* Stats */}
            {stats && (
                <div className={s.statsGrid}>
                    {[
                        { label: t('totalMembers'), value: stats.totalMembers, key: "total" },
                        { label: "🥉 Bronze",     value: stats.bronze,       key: "BRONZE" },
                        { label: "🥈 Silver",     value: stats.silver,       key: "SILVER" },
                        { label: "🥇 Gold",       value: stats.gold,         key: "GOLD" },
                        { label: "💎 Platinum",   value: stats.platinum,     key: "PLATINUM" },
                    ].map(st => (
                        <div key={st.key} className={s.statCard}>
                            <div className={`${s.statValue} ${STAT_VALUE_CLS[st.key]}`}>{st.value}</div>
                            <div className={s.statLabel}>{st.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tier reference */}
            <div className={s.tierRef}>
                <div className={s.tierRefTitle}>{t('tierRequirements')}</div>
                <div className={s.tierCards}>
                    {TIER_THRESHOLDS.map(thresh => (
                        <div key={thresh.tier} className={`${s.tierCard} ${thresh.cls}`}>
                            <div className={`${s.tierCardName} ${thresh.nameCls}`}>{TIER_EMOJI[thresh.tier]} {thresh.tier}</div>
                            <div className={s.tierCardRange}>{thresh.range}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filter tabs */}
            <div className={s.filters}>
                {["ALL", "BRONZE", "SILVER", "GOLD", "PLATINUM"].map(tierKey => (
                    <button
                        key={tierKey}
                        type="button"
                        className={`${s.filterBtn} ${filterTier === tierKey ? s.filterBtnActive : ""}`}
                        onClick={() => setFilterTier(tierKey)}
                    >
                        {tierKey === "ALL" ? t('all') : `${TIER_EMOJI[tierKey]} ${tierKey}`}
                    </button>
                ))}
            </div>

            {/* Members table */}
            <div className={s.tableWrap}>
                <table className="ui-table">
                    <thead>
                        <tr>
                            <th>{t('guest')}</th>
                            <th>{t('email')}</th>
                            <th>{t('tier')}</th>
                            <th>{t('points')}</th>
                            <th>{t('stays')}</th>
                            <th>{t('totalSpent')}</th>
                            <th>{t('redeem')}</th>
                            <th>{t('updated', 'Updated')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(m => (
                            <tr key={m.id}>
                                <td className="cell-name">{m.guestName}</td>
                                <td className="cell-muted">{m.guestEmail}</td>
                                <td>
                                    <span className={`${s.tierBadge} ${TIER_BADGE_CLS[m.tier] ?? ""}`}>
                                        {TIER_EMOJI[m.tier]} {m.tier}
                                    </span>
                                </td>
                                <td className={s.pointsCell}>{m.points.toLocaleString()}</td>
                                <td>{m.totalStays}</td>
                                <td className="cell-mono">€{Number(m.totalSpent).toFixed(2)}</td>
                                <td>
                                    <div className={s.redeemRow}>
                                        <input
                                            type="number"
                                            placeholder="pts"
                                            value={redeemInput[m.id] ?? ""}
                                            onChange={e => setRedeemInput(p => ({ ...p, [m.id]: e.target.value }))}
                                            className={s.redeemInput}
                                        />
                                        <button type="button" className={s.redeemBtn} onClick={() => redeem(m.id)}>{t('redeem')}</button>
                                    </div>
                                </td>
                                <td className="cell-muted">{new Date(m.updatedAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && <div className={s.empty}>{t('noMembers')}</div>}
            </div>

            {/* Award points modal */}
            {showAward && (
                <div className={s.overlay}>
                    <div className={s.modal}>
                        <div className={s.modalTitle}>{t('awardLoyaltyPoints')}</div>
                        {AWARD_FIELDS.map(f => (
                            <div key={f.name}>
                                <label className={s.fieldLabel} htmlFor={`award-${f.name}`}>{t(f.labelKey)}</label>
                                <input
                                    id={`award-${f.name}`}
                                    type={f.type ?? "text"}
                                    value={awardForm[f.name]}
                                    onChange={e => setAwardForm(p => ({ ...p, [f.name]: e.target.value }))}
                                    className={s.fieldInput}
                                />
                            </div>
                        ))}
                        <div className={s.modalActions}>
                            <button type="button" className={s.submitBtn} onClick={award}>{t('awardPoints')}</button>
                            <button type="button" className={s.cancelBtn} onClick={() => setShowAward(false)}>{t('cancel')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
