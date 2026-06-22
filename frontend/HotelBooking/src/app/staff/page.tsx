"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/StaffSchedule.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type StaffMember = { id: string; firstName: string; lastName: string; department: string; role: string };
type Shift = {
    id: string; staffId: string; staffName: string; department: string;
    shiftStart: string; shiftEnd: string; date: string; status: string; notes?: string;
};

const DAYS_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DEPT_COLORS: Record<string, string> = {
    Housekeeping: "#22c55e", Reception: "#3b82f6", Restaurant: "#f59e0b",
    Security: "#8b5cf6", Maintenance: "#ef4444", Management: "#0ea5e9", Other: "#94a3b8",
};

const DEPT_BORDER_CLS: Record<string, string> = {
    Housekeeping: s.deptHousekeeping, Reception: s.deptReception, Restaurant: s.deptRestaurant,
    Security: s.deptSecurity, Maintenance: s.deptMaintenance, Management: s.deptManagement, Other: s.deptOther,
};

const DEPT_TEXT_CLS: Record<string, string> = {
    Housekeeping: s.deptTextHousekeeping, Reception: s.deptTextReception, Restaurant: s.deptTextRestaurant,
    Security: s.deptTextSecurity, Maintenance: s.deptTextMaintenance, Management: s.deptTextManagement, Other: s.deptTextOther,
};

function isoWeek(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function mondayOf(week: string): Date {
    const [y, w] = week.split("-W").map(Number);
    const jan4 = new Date(y, 0, 4);
    const startOfWeek = new Date(jan4);
    startOfWeek.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (w - 1) * 7);
    return startOfWeek;
}

function dateOfDay(monday: Date, dayIdx: number): string {
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayIdx);
    return d.toISOString().split("T")[0];
}

export default function StaffSchedulePage() {
  const { t } = useTranslation();
    const [shifts, setShifts]   = useState<Shift[]>([]);
    const [staff, setStaff]     = useState<StaffMember[]>([]);
    const [week, setWeek]       = useState(isoWeek(new Date()));
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        staffId: "", staffName: "", department: "Reception",
        shiftStart: "09:00", shiftEnd: "17:00", date: "", notes: "",
    });

    const monday = useMemo(() => mondayOf(week), [week]);

    const load = () => {
        setLoading(true);
        Promise.all([
            api.get(`/api/staff/shifts/week?week=${week}`),
            api.get("/api/staff"),
        ]).then(([sh, st]) => {
            setShifts(Array.isArray(sh.data) ? sh.data : []);
            setStaff(Array.isArray(st.data) ? st.data : []);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [week]);

    function prevWeek() {
        const d = mondayOf(week);
        d.setDate(d.getDate() - 7);
        setWeek(isoWeek(d));
    }
    function nextWeek() {
        const d = mondayOf(week);
        d.setDate(d.getDate() + 7);
        setWeek(isoWeek(d));
    }

    function shiftsOn(dayIdx: number) {
        const date = dateOfDay(monday, dayIdx);
        return shifts.filter(sh => sh.date === date);
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        const member = staff.find(m => m.id === form.staffId);
        const payload = {
            ...form,
            staffName: member ? `${member.firstName} ${member.lastName}` : form.staffName,
        };
        await api.post("/api/staff/shifts", payload);
        setShowForm(false);
        setForm({ staffId: "", staffName: "", department: "Reception", shiftStart: "09:00", shiftEnd: "17:00", date: "", notes: "" });
        load();
    }

    async function deleteShift(id: string) {
        await api.delete(`/api/staff/shifts/${id}`);
        load();
    }

    async function updateStatus(id: string, status: string) {
        await api.patch(`/api/staff/shifts/${id}/status`, { status });
        load();
    }

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('staffSchedule')}</h1>
                    <p className="page-subtitle">{t('weeklyShiftPlanning')} — {week}</p>
                </div>
                <div className="page-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={prevWeek}>← {t('prevWeek')}</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setWeek(isoWeek(new Date()))}>{t('today')}</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={nextWeek}>{t('nextWeek')} →</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
                        {showForm ? t('cancel') : `+ ${t('addShift')}`}
                    </button>
                </div>
            </div>

            {/* Add shift form */}
            {showForm && (
                <div className={s.formCard}>
                    <form onSubmit={submit} className={s.formGrid}>
                        <div className="form-field">
                            <label className="form-label">{t('staffMember')}</label>
                            <select title="Staff member" className="form-select" value={form.staffId}
                                onChange={e => {
                                    const m = staff.find(sm => sm.id === e.target.value);
                                    setForm(f => ({ ...f, staffId: e.target.value, department: m?.department ?? f.department }));
                                }} required>
                                <option value="">{t('selectStaff')}</option>
                                {staff.map(m => (
                                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} — {m.department}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-field">
                            <label className="form-label">{t('department')}</label>
                            <select title="Department" className="form-select" value={form.department}
                                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                                {Object.keys(DEPT_COLORS).map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="form-field">
                            <label className="form-label">{t('date')}</label>
                            <input type="date" title="Shift date" className="form-input" value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                        </div>
                        <div className="form-field">
                            <label className="form-label">{t('shiftStart')}</label>
                            <input type="time" title="Shift start time" className="form-input" value={form.shiftStart}
                                onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))} />
                        </div>
                        <div className="form-field">
                            <label className="form-label">{t('shiftEnd')}</label>
                            <input type="time" title="Shift end time" className="form-input" value={form.shiftEnd}
                                onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))} />
                        </div>
                        <div className="form-field">
                            <label className="form-label">{t('notes')}</label>
                            <input type="text" className="form-input" value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder={t('optional')} />
                        </div>
                        <div className={s.formActions}>
                            <button type="submit" className="btn btn-primary">{t('saveShift')}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Weekly calendar grid */}
            {loading ? (
                <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingShifts')}</p></div>
            ) : (
                <div className={s.grid}>
                    {DAYS_KEYS.map((dayKey, i) => {
                        const date = dateOfDay(monday, i);
                        const dayShifts = shiftsOn(i);
                        const isToday = date === new Date().toISOString().split("T")[0];
                        return (
                            <div key={dayKey} className={`${s.dayCol} ${isToday ? s.today : ""}`}>
                                <div className={s.dayHeader}>
                                    <span className={s.dayName}>{t(dayKey).slice(0, 3)}</span>
                                    <span className={s.dayDate}>{date.slice(5)}</span>
                                    {isToday && <span className={s.todayBadge}>{t('today')}</span>}
                                </div>
                                <div className={s.dayBody}>
                                    {dayShifts.length === 0 && (
                                        <div className={s.empty}>{t('noShifts')}</div>
                                    )}
                                    {dayShifts.map(sh => (
                                            <div key={sh.id} className={`${s.shiftCard} ${DEPT_BORDER_CLS[sh.department] ?? s.deptOther}`}>
                                                <div className={s.shiftName}>{sh.staffName}</div>
                                                <div className={s.shiftTime}>{sh.shiftStart} – {sh.shiftEnd}</div>
                                                <div className={`${s.shiftDept} ${DEPT_TEXT_CLS[sh.department] ?? s.deptTextOther}`}>{sh.department}</div>
                                                <div className={s.shiftActions}>
                                                    <select
                                                        className={s.statusSelect}
                                                        value={sh.status}
                                                        onChange={e => updateStatus(sh.id, e.target.value)}
                                                        title="Update status"
                                                    >
                                                        {["SCHEDULED","CONFIRMED","ABSENT","COMPLETED"].map(st => (
                                                            <option key={st} value={st}>{st}</option>
                                                        ))}
                                                    </select>
                                                    <button type="button" className={s.deleteBtn} onClick={() => deleteShift(sh.id)} title="Remove">×</button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
