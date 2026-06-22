"use client";

import { useState, useEffect } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/CheckIns.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type CheckIn = {
    id: string;
    bookingId: string;
    guestEmail: string;
    firstName: string;
    lastName: string;
    passportNumber: string;
    nationality: string;
    dateOfBirth: string;
    address: string;
    estimatedArrivalTime: string;
    specialRequests: string;
    earlyCheckIn: boolean;
    lateCheckOut: boolean;
    extraBed: boolean;
    airportTransfer: boolean;
    status: string;
    confirmationCode: string;
    createdAt: string;
};

type Stats = { submitted: number; reviewed: number; approved: number; rejected: number };

const STATUS_CLS: Record<string, string> = {
    SUBMITTED: s.statusSubmitted,
    REVIEWED:  s.statusReviewed,
    APPROVED:  s.statusApproved,
    REJECTED:  s.statusRejected,
};

const KPI_CLS = [s.kpiBlue, s.kpiAmber, s.kpiGreen, s.kpiRed];

export default function CheckInsStaffPage() {
  const { t } = useTranslation();
    const [checkins, setCheckins] = useState<CheckIn[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [filter, setFilter] = useState("ALL");
    const [selected, setSelected] = useState<CheckIn | null>(null);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        api.get("/api/checkins").then((r: { data: CheckIn[] }) => setCheckins(r.data)).catch(() => { setCheckins([]); }).finally(() => setLoading(false));
        api.get("/api/checkins/stats").then((r: { data: Stats }) => setStats(r.data)).catch(() => {});
    };

    useEffect(() => { load(); }, []);

    const approve = async (id: string) => {
        try { await api.patch(`/api/checkins/${id}/approve`); load(); setSelected(null); }
        catch { alert("Failed to approve."); }
    };

    const reject = async (id: string) => {
        if (!confirm(t('rejectConfirm'))) return;
        try { await api.patch(`/api/checkins/${id}/reject`); load(); setSelected(null); }
        catch { alert("Failed to reject."); }
    };

    const filtered = filter === "ALL" ? checkins : checkins.filter(c => c.status === filter);

    const kpiItems = stats ? [
        { label: t('submitted'),   value: stats.submitted, icon: "📥", cls: KPI_CLS[0] },
        { label: t('underReview'), value: stats.reviewed,  icon: "🔍", cls: KPI_CLS[1] },
        { label: t('approved'),    value: stats.approved,  icon: "✅", cls: KPI_CLS[2] },
        { label: t('rejected'),    value: stats.rejected,  icon: "❌", cls: KPI_CLS[3] },
    ] : [];

    return (
        <div className={s.page}>
            <div className={s.pageHeader}>
                <h1 className={s.pageTitle}>{t('onlineCheckInMgmt')}</h1>
                <p className={s.pageSub}>{t('onlineCheckInSubtitle')}</p>
            </div>

            {stats && (
                <div className={s.kpiGrid}>
                    {kpiItems.map(k => (
                        <div key={k.label} className={`${s.kpiCard} ${k.cls}`}>
                            <div className={s.kpiIcon}>{k.icon}</div>
                            <div className={s.kpiValue}>{k.value}</div>
                            <div className={s.kpiLabel}>{k.label}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className={s.tabBar}>
                {["ALL", "SUBMITTED", "REVIEWED", "APPROVED", "REJECTED"].map(f => (
                    <button key={f} type="button" onClick={() => setFilter(f)}
                        className={`${s.tabBtn} ${filter === f ? s.tabActive : ""}`}>
                        {f}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className={s.emptyCell}>{t('loadingCheckIns')}</div>
            ) : (
                <div className={selected ? s.layoutSplit : s.layoutFull}>
                    <div className={s.tableCard}>
                        <table className={s.uiTable}>
                            <thead className={s.tHead}>
                                <tr>
                                    {[t('guest'), t('bookingIdLabel'), t('confirmationCode'), t('estArrival'), t('status'), "Extras", t('actions')].map(h => (
                                        <th key={h} className={s.tTh}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={7} className={s.emptyCell}>{t('noCheckInsFound')}</td></tr>
                                ) : filtered.map(c => {
                                    const extras = [c.earlyCheckIn && "Early CI", c.lateCheckOut && "Late CO", c.extraBed && "Extra Bed", c.airportTransfer && "Transfer"].filter(Boolean);
                                    return (
                                        <tr key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
                                            className={`${s.tRow} ${selected?.id === c.id ? s.tRowActive : ""}`}>
                                            <td className={s.tTd}>
                                                <div className={s.guestName}>{c.firstName} {c.lastName}</div>
                                                <div className={s.guestEmail}>{c.guestEmail}</div>
                                            </td>
                                            <td className={`${s.tTd} ${s.cellMono}`}>{c.bookingId ? c.bookingId.substring(0, 8) + "..." : "—"}</td>
                                            <td className={`${s.tTd} ${s.cellCode}`}>{c.confirmationCode}</td>
                                            <td className={`${s.tTd} ${s.cellSm}`}>{c.estimatedArrivalTime || "—"}</td>
                                            <td className={s.tTd}>
                                                <span className={`${s.statusBadge} ${STATUS_CLS[c.status] ?? s.statusDefault}`}>{c.status}</span>
                                            </td>
                                            <td className={s.tTd}>
                                                <div className={s.extraPills}>
                                                    {extras.map(e => (
                                                        <span key={String(e)} className={s.extraPill}>{e}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className={s.tTd}>
                                                {c.status === "SUBMITTED" && (
                                                    <div className={s.rowActions}>
                                                        <button type="button" className={s.btnApprove}
                                                            onClick={e => { e.stopPropagation(); approve(c.id); }}>
                                                            {t('approve')}
                                                        </button>
                                                        <button type="button" className={s.btnReject}
                                                            onClick={e => { e.stopPropagation(); reject(c.id); }}>
                                                            {t('reject')}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {selected && (
                        <div className={s.detailPanel}>
                            <div className={s.detailHeader}>
                                <h3 className={s.detailTitle}>{t('checkInDetails')}</h3>
                                <button type="button" className={s.closeBtn} onClick={() => setSelected(null)}>×</button>
                            </div>
                            <div className={s.detailGrid}>
                                {[
                                    [t('confirmationCode'), selected.confirmationCode],
                                    [t('fullName'), selected.firstName + " " + selected.lastName],
                                    [t('emailLabel'), selected.guestEmail],
                                    [t('passportIdNumber'), selected.passportNumber],
                                    [t('nationality'), selected.nationality],
                                    [t('dateOfBirth'), selected.dateOfBirth],
                                    [t('address'), selected.address],
                                    [t('estArrival'), selected.estimatedArrivalTime || t('notSpecified')],
                                ].map(([label, value]) => (
                                    <div key={label} className={s.detailRow}>
                                        <span className={s.detailLabel}>{label}</span>
                                        <span className={s.detailValue}>{value}</span>
                                    </div>
                                ))}
                            </div>
                            {selected.specialRequests && (
                                <div className={s.specialRequests}>
                                    <strong>{t('specialRequests')}:</strong> {selected.specialRequests}
                                </div>
                            )}
                            <div className={s.serviceExtras}>
                                {selected.earlyCheckIn   && <span className={s.extraBlue}>{t('earlyCheckIn')}</span>}
                                {selected.lateCheckOut   && <span className={s.extraBlue}>{t('lateCheckOut')}</span>}
                                {selected.extraBed       && <span className={s.extraYellow}>{t('extraBed')}</span>}
                                {selected.airportTransfer && <span className={s.extraGreen}>{t('airportTransfer')}</span>}
                            </div>
                            {selected.status === "SUBMITTED" && (
                                <div className={s.detailActions}>
                                    <button type="button" className={s.btnApproveDetail} onClick={() => approve(selected.id)}>{t('approve')}</button>
                                    <button type="button" className={s.btnRejectDetail}  onClick={() => reject(selected.id)}>{t('reject')}</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
