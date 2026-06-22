'use client';

import GenerateInvoiceButton from "@/components/invoices/GenerateInvoiceButton";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/components/lib/axiosConfig';
import styles from '@/styles/BookingList.module.css';
import AiInsightCard from "@/components/AiInsightCard";
import Paginator from "@/components/ui/Paginator";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const lines = [
        headers.join(","),
        ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

/* ---------- Helpers: UI ---------- */
const Icon = ({ children }: { children: React.ReactNode }) => (
    <span className={styles.icon} aria-hidden>
    {children}
  </span>
);


function onMenuClick<T extends HTMLElement>(
    e: React.MouseEvent<T>,
    action: () => void
) {
    e.preventDefault();
    e.stopPropagation();
    const d = e.currentTarget.closest('details') as HTMLDetailsElement | null;
    if (d) d.open = false;
    action();
}

/* ---------- Types ---------- */
type Money = number | string;

export interface Service { id: string; name: string; price: Money; }

export interface Booking {
    id: string;
    guestId: string;
    guestName?: string;
    roomNumber: string | number;
    roomId?: string;
    checkInDate: string;   // ISO
    checkOutDate: string;  // ISO
    paymentStatus: 'PENDING' | 'PAID' | 'CANCELLED' | string;
    bookingStatus:
        | 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT'
        | 'CANCELLED' | 'COMPLETED' | string;
    totalAmount: Money;
    services?: Service[];
}

interface Guest { id: string; firstName: string; lastName: string; }
interface Room  { id: string; roomNumber: string | number; }

type Tab = 'active' | 'history';
type SortKey = 'guest' | 'room' | 'checkIn' | 'checkOut' | 'status' | 'payment' | 'total';

/* ---------- Helpers: data ---------- */
const toNumber = (v: Money | undefined | null) =>
    typeof v === 'number' ? (isFinite(v) ? v : 0)
        : typeof v === 'string' ? (isFinite(+v) ? +v : 0)
            : 0;

const formatMoney = (n: Money, currency = 'EUR') =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(toNumber(n));

const formatDate = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
            .format(new Date(iso))
        : '—';

const chipClass = (v?: string) => {
    const key = String(v || '').toLowerCase();
    return `${styles.chip} ${styles[`is-${key}`] || styles['is-default']}`;
};

const getLS = (k: string) => (typeof window !== 'undefined' ? localStorage.getItem(k) : null);

/* ---------- API fallback helper ---------- */
/**  /checkin ↔ /check-in, /checkout ↔ /check-out */
async function putBookingAction(id: string, action: 'checkin'|'checkout'|'cancel') {
    const url =
        action === 'checkin'  ? `/api/bookings/${id}/checkin`  :
            action === 'checkout' ? `/api/bookings/${id}/checkout` :
                `/api/bookings/${id}/cancel`;
    return api.put(url, {});
}


/* ---------- Component ---------- */
const PAGE_SIZE = 20;

export default function BookingList() {
  const { t } = useTranslation();
    const [bookings,      setBookings]      = useState<Booking[]>([]);
    const [guests,        setGuests]        = useState<Guest[]>([]);
    const [rooms,         setRooms]         = useState<Room[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [err,           setErr]           = useState('');
    const [info,          setInfo]          = useState('');
    const [busyId,        setBusyId]        = useState<string | null>(null);
    const [page,          setPage]          = useState(0);
    const [totalPages,    setTotalPages]    = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // UI state
    const [tab, setTab] = useState<Tab>(() => (getLS('bl:tab') as Tab) || 'active');
    const [dense, setDense] = useState<boolean>(() => getLS('bl:dense') === '1');
    const [q, setQ] = useState("");
    // Sorting
    const [sortKey, setSortKey] = useState<SortKey>('checkIn');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    useEffect(() => { localStorage.setItem('bl:tab', tab); }, [tab]);
    useEffect(() => { localStorage.setItem('bl:dense', dense ? '1' : '0'); }, [dense]);

    async function fetchAll(p = page) {
        try {
            setLoading(true);
            setErr('');
            const [bRes, gRes, rRes] = await Promise.all([
                api.get(`/api/bookings?page=${p}&size=${PAGE_SIZE}`),
                api.get('/api/guests?page=0&size=200'),
                api.get('/api/rooms?page=0&size=200'),
            ]);
            const b = bRes.data, g = gRes.data, r = rRes.data;
            const bookingsArr: Booking[] = b?.content ?? (Array.isArray(b) ? b : []);
            const guestsArr:   Guest[]   = g?.content ?? (Array.isArray(g) ? g : []);
            const roomsArr:    Room[]    = r?.content ?? (Array.isArray(r) ? r : []);

            setTotalPages(b?.totalPages ?? 1);
            setTotalElements(b?.totalElements ?? 0);
            setBookings(bookingsArr);
            setGuests(guestsArr);
            setRooms(roomsArr);
        } catch (e: any) {
            console.error('Fetch failed:', e);
            setErr(e?.response?.data?.message || e?.message || 'Failed to load bookings.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchAll(page); }, [page]);

    const findGuestName = (guestId: string, fallback?: string) => {
        if (fallback) return fallback;
        const g = guests.find(x => x.id?.toLowerCase() === guestId?.toLowerCase());
        return g ? `${g.firstName} ${g.lastName}` : 'Unknown Guest';
    };

    const resolveRoomId = (b: Booking) => {
        if (b.roomId) return b.roomId;
        const match = rooms.find(r => String(r.roomNumber) === String(b.roomNumber));
        return match?.id;
    };

    const servicesTotal = (services?: Service[]) =>
        (services ?? []).reduce((sum, s) => sum + toNumber(s.price), 0);

    const updateBookingLocal = (id: string, patch: Partial<Booking>) =>
        setBookings(prev => prev.map(x => (x.id === id ? { ...x, ...patch } : x)));

    // ---- Common runner: always sync with backend after success ----
    const runAction = async (
        id: string,
        call: () => Promise<any>,
        successMsg: string
    ) => {
        setBusyId(id);
        setErr('');
        setInfo('');
        try {
            const res = await call();
            const data = res?.data;
            // თუ ბექი აბრუნებს განახლებულ booking-ს, პირდაპირ ლოკალშიც შევცვალოთ; წინააღმდეგ შემთხვევაში — სრულად წავიკითხოთ
            if (data && typeof data === 'object' && 'id' in data) {
                updateBookingLocal((data as any).id, data as Partial<Booking>);
            } else {
                await fetchAll();
            }
            setInfo(successMsg);
        } catch (e: any) {
            const s = e?.response?.status;
            const m = e?.response?.data?.message || e?.message || 'Operation failed.';
            const u = e?.config?.url ? ` @ ${e.config.url}` : '';
            setErr(`${s ?? ''} ${m}${u}`);
            await fetchAll();
        } finally {
            setBusyId(null);
        }
    };

    // ---- Actions (with slug fallback) ----
    function humanizeError(e: any) {
        const s = e?.response?.status;
        const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Operation failed.';
        if (s === 401) return '401 Unauthorized';
        if (s === 403) return '403 Forbidden ';
        if (s === 404) return '404 Not Found ';
        if (s === 405) return '405 Method Not Allowed ';
        if (s === 409) return `409 Conflict  ${msg}`;
        return `❌ ${s ?? ''} ${msg}`;
    }

    const handleCheckIn = async (id: string) => {
        if (!confirm(t('checkInConfirm'))) return;
        try {
            const r = await putBookingAction(id, 'checkin');
            console.log('CHECKIN 200 ->', r.data);
            await fetchAll();
            setInfo(t('checkedIn'));
        } catch (e: any) {
            console.log('CHECKIN FAIL', e?.response?.status, e?.config?.url, e?.response?.data);
            setErr(humanizeError(e));
        }
    };

    const handleCheckOut = async (id: string) => {
        if (!confirm(t('checkOutConfirm'))) return;
        try {
            const r = await putBookingAction(id, 'checkout');
            console.log('CHECKOUT 200 ->', r.data);
            await fetchAll();
            setInfo(t('checkedOut'));
        } catch (e: any) {
            console.log('CHECKOUT FAIL', e?.response?.status, e?.config?.url, e?.response?.data);
            setErr(humanizeError(e));
        }
    };

    const handleCancel = (id: string) => {
        if (!confirm(t('cancelConfirm'))) return;
        return runAction(id, () => putBookingAction(id, 'cancel'), t('bookingCancelled'));
    };

    // auto-clear info
    useEffect(() => {
        if (!info) return;
        const t = setTimeout(() => setInfo(''), 2500);
        return () => clearTimeout(t);
    }, [info]);

    // History rule: CHECKED_OUT|COMPLETED + PAID → History
    const isHistory = (b: Booking) => {
        const st  = String(b.bookingStatus).toUpperCase();
        const pay = String(b.paymentStatus).toUpperCase();
        return (st === 'CHECKED_OUT' || st === 'COMPLETED') && pay === 'PAID';
    };

    const activeRows  = useMemo(() => bookings.filter(b => !isHistory(b)), [bookings]);
    const historyRows = useMemo(() => bookings.filter(isHistory), [bookings]);

    // Sorting
    function sortRows(input: Booking[]) {
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...input].sort((a, b) => {
            const A = (() => {
                switch (sortKey) {
                    case 'guest':   return (a.guestName || findGuestName(a.guestId)).toLowerCase();
                    case 'room':    return String(a.roomNumber);
                    case 'checkIn': return a.checkInDate;
                    case 'checkOut':return a.checkOutDate;
                    case 'status':  return String(a.bookingStatus);
                    case 'payment': return String(a.paymentStatus);
                    case 'total':   return toNumber(a.totalAmount);
                }
            })();
            const B = (() => {
                switch (sortKey) {
                    case 'guest':   return (b.guestName || findGuestName(b.guestId)).toLowerCase();
                    case 'room':    return String(b.roomNumber);
                    case 'checkIn': return b.checkInDate;
                    case 'checkOut':return b.checkOutDate;
                    case 'status':  return String(b.bookingStatus);
                    case 'payment': return String(b.paymentStatus);
                    case 'total':   return toNumber(b.totalAmount);
                }
            })();
            return (A > B ? 1 : A < B ? -1 : 0) * dir;
        });
    }

    const baseRows = tab === 'active' ? activeRows : historyRows;
    const rows = useMemo(() => sortRows(baseRows), [baseRows, sortKey, sortDir]);
    const filteredRows = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return rows;

        return rows.filter((b) => {
            const guest = (b.guestName || findGuestName(b.guestId)).toLowerCase();
            const room = String(b.roomNumber).toLowerCase();
            const st = String(b.bookingStatus).toLowerCase();
            const pay = String(b.paymentStatus).toLowerCase();

            return (
                guest.includes(s) ||
                room.includes(s) ||
                st.includes(s) ||
                pay.includes(s)
            );
        });
    }, [rows, q, guests]);

    function onSort(k: SortKey){
        setSortDir(prev => (sortKey === k ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
        setSortKey(k);
    }

    if (loading) return <div className={styles.loading}>{t('loading')}</div>;

    return (
        <div className={`${styles.scope} ${styles.container} ${dense ? styles.dense : ""}`}>
            <AiInsightCard endpoint="/api/ai/insights/bookings" title={t('aiBookingAnalysis')} compact />
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>📄 {t('bookingList')}</h1>
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t('searchBookings')}
                    className={styles.search}
                />

                <div className={styles.tabs}>
                    <button
                        type="button"
                        onClick={() => setTab("active")}
                        className={`${styles.tab} ${tab === "active" ? styles.active : ""}`}
                        aria-pressed={tab === "active"}
                    >
                        🔵 {t('activeTab')} ({activeRows.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("history")}
                        className={`${styles.tab} ${tab === "history" ? styles.active : ""}`}
                        aria-pressed={tab === "history"}
                    >
                        🗂️ {t('historyTab')} ({historyRows.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setDense((d) => !d)}
                        className={styles.tab}
                        aria-pressed={dense}
                        title="Toggle row density"
                    >
                        {dense ? t('comfortable') : t('compact')}
                    </button>
                </div>

                <div className={styles.totalPill}>
                    ∑ {t('total')} ({tab === "active" ? t('activeBookings') : t('history')}):{" "}
                    <strong>
                        {formatMoney(rows.reduce((sum, b) => sum + toNumber(b.totalAmount), 0))}
                    </strong>
                </div>
                <button type="button" className={styles.tab}
                    title="Export visible bookings to CSV"
                    onClick={() => exportCsv(`bookings-${tab}-${new Date().toISOString().slice(0,10)}.csv`,
                        rows.map(b => ({
                            id: b.id,
                            guest: b.guestName || b.guestId || "",
                            room: b.roomNumber || b.roomId || "",
                            checkIn: b.checkInDate,
                            checkOut: b.checkOutDate,
                            status: b.bookingStatus,
                            payment: b.paymentStatus,
                            total: toNumber(b.totalAmount),
                        })))
                    }>
                    ⬇ CSV
                </button>
            </div>

            {err && <p className={styles.error}>⚠️ {err}</p>}
            {info && <p className={styles.info}>ℹ️ {info}</p>}

            {/* Table */}
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead className={styles.thead}>
                    <tr>
                        <th className={`${styles.stickyFirst} ${styles.sortHead}`} onClick={() => onSort("guest")}>
                            <span className={styles.cell}><Icon>👤</Icon>{t('guest')}</span>
                        </th>
                        <th className={styles.sortHead} onClick={() => onSort("room")}>
                            <span className={styles.cell}><Icon>🏨</Icon>{t('room')}</span>
                        </th>
                        <th className={styles.sortHead} onClick={() => onSort("checkIn")}>
                            <span className={styles.cell}><Icon>📥</Icon>{t('checkIn')}</span>
                        </th>
                        <th className={styles.sortHead} onClick={() => onSort("checkOut")}>
                            <span className={styles.cell}><Icon>📤</Icon>{t('checkOut')}</span>
                        </th>
                        <th className={styles.sortHead} onClick={() => onSort("status")}>
                            <span className={styles.cell}><Icon>🔖</Icon>{t('status')}</span>
                        </th>
                        <th className={styles.sortHead} onClick={() => onSort("payment")}>
                            <span className={styles.cell}><Icon>💳</Icon>{t('payments')}</span>
                        </th>
                        <th><span className={styles.cell}><Icon>🧰</Icon>{t('services')}</span></th>
                        <th className={styles.sortHead} onClick={() => onSort("total")}>
                            <span className={styles.cell}><Icon>∑</Icon>{t('total')}</span>
                        </th>
                        <th className={`${styles.actionsHead} ${styles.stickyLast}`}>
                            <span className={styles.cell}><Icon>⚙️</Icon>{t('actions')}</span>
                        </th>
                    </tr>
                    </thead>

                    <tbody>
                    {filteredRows.map((b) => {
                        const sTotal = servicesTotal(b.services);
                        const roomId = resolveRoomId(b);
                        const inHistory = isHistory(b);

                        const bs = (b.bookingStatus || "").toUpperCase();
                        const ps = (b.paymentStatus || "").toUpperCase();
                        const bsIcon =
                            bs === "PENDING"    ? "⏳" :
                                bs === "CONFIRMED"  ? "✅" :
                                    bs === "CHECKED_IN" ? "🏨⬅️" :
                                        bs === "CHECKED_OUT"? "🏁" :
                                            bs.includes("CANCEL") ? "❌" : "🔖";
                        const psIcon =
                            ps.includes("PAID") || ps === "COMPLETED" ? "💰" :
                                ps.includes("PENDING") ? "⏳" :
                                    ps.includes("FAIL") ? "❌" : "💳";

                        return (
                            <tr key={b.id} className={styles.row}>
                                <td className={styles.stickyFirst}>
                                    <Link href={`/guests/${b.guestId}`} className={`${styles.link} ${styles.cell}`}>
                                        <Icon>👤</Icon><span>{findGuestName(b.guestId, b.guestName)}</span>
                                    </Link>
                                </td>

                                <td>
                                    {roomId ? (
                                        <Link href={`/rooms/${roomId}`} className={`${styles.linkMuted} ${styles.cell}`}>
                                            <Icon>🏨</Icon><span>{b.roomNumber}</span>
                                        </Link>
                                    ) : (
                                        <span className={`${styles.muted} ${styles.cell}`}>
                        <Icon>🏨</Icon><span>{b.roomNumber}</span>
                      </span>
                                    )}
                                </td>

                                <td className={styles.dateDim}>
                                    <span className={styles.cell}><Icon>📥</Icon>{formatDate(b.checkInDate)}</span>
                                </td>
                                <td className={styles.dateDim}>
                                    <span className={styles.cell}><Icon>📤</Icon>{formatDate(b.checkOutDate)}</span>
                                </td>

                                <td>
                    <span className={chipClass(b.bookingStatus)}>
                      <Icon>{bsIcon}</Icon>{b.bookingStatus}
                    </span>
                                </td>
                                <td>
                    <span className={chipClass(b.paymentStatus)}>
                      <Icon>{psIcon}</Icon>{b.paymentStatus}
                    </span>
                                </td>

                                <td className={`${styles.mono} ${styles.right} ${styles.servicesCell}`}>
                                    <span className={styles.cell}><Icon>🧰</Icon>{formatMoney(sTotal)}</span>
                                </td>

                                <td className={`${styles.mono} ${styles.bold} ${styles.right} ${styles.totalAccent}`}>
                                    <span className={styles.cell}><Icon>∑</Icon>{formatMoney(b.totalAmount)}</span>
                                </td>

                                <td className={`${styles.actionsCell} ${styles.stickyLast}`}>
                                    {!inHistory ? (
                                        <details className={styles.menu}>
                                            <summary
                                                className={styles.menuBtn}
                                                aria-label="Open actions menu"
                                                role="button"
                                            >
                                                ⋯
                                            </summary>
                                            <div className={styles.menuList}>
                                                <Link href={`/bookings/${b.id}`} className={styles.menuItem}>
                                                    <Icon>👁️</Icon><span>{t('viewBooking')}</span>
                                                </Link>

                                                <button
                                                    type="button"
                                                    className={styles.menuItem}
                                                    disabled={busyId === b.id}
                                                    onClick={(e) => onMenuClick(e, () => handleCheckIn(b.id))}
                                                >
                                                    <Icon>✅</Icon><span>{busyId === b.id ? t('workingDots') : t('checkInAction')}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    className={styles.menuItem}
                                                    disabled={busyId === b.id}
                                                    onClick={(e) => onMenuClick(e, () => handleCheckOut(b.id))}
                                                >
                                                    <Icon>🚪</Icon><span>{busyId === b.id ? t('workingDots') : t('checkOutAction')}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    className={`${styles.menuItem} ${styles.danger}`}
                                                    disabled={busyId === b.id}
                                                    onClick={(e) => onMenuClick(e, () => handleCancel(b.id))}
                                                >
                                                    <Icon>🛑</Icon><span>{busyId === b.id ? t('workingDots') : t('cancelAction')}</span>
                                                </button>

                                                <Link href={`/add-payment?bookingId=${b.id}`} className={styles.menuItem}>
                                                    <Icon>💳</Icon><span>{t('addPaymentAction')}</span>
                                                </Link>
                                                <Link
                                                    href={`/add-service-request?guestId=${b.guestId}&bookingId=${b.id}`}
                                                    className={styles.menuItem}
                                                >
                                                    <Icon>🛎️</Icon><span>{t('addServices')}</span>
                                                </Link>
                                                <div className={styles.menuItem}>
                                                    <Icon>⚙️</Icon>
                                                    <GenerateInvoiceButton
                                                        bookingId={b.id}
                                                        ensure={false}   // ✅ forces POST /api/invoices/{bookingId}
                                                        label={t('generateInvoice')}
                                                    />
                                                </div>

                                            </div>
                                        </details>
                                    ) : (
                                        <span className={styles.archived}>
                        <Icon>🗄️</Icon><span>{t('archived')}</span>
                      </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
            <Paginator
                page={page}
                totalPages={totalPages}
                totalElements={totalElements}
                size={PAGE_SIZE}
                onPageChange={setPage}
            />
        </div>
    );
}
