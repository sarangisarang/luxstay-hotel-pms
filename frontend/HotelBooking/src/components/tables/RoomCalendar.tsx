'use client';

import { useEffect, useState, useCallback } from 'react';
import api from "@/components/lib/axiosConfig";
import styles from "@/styles/RoomCalendar.module.css";

type Booking = {
    id: string;
    guestName: string;
    roomId: string;
    roomNumber: number;
    checkInDate: string;
    checkOutDate: string;
    bookingStatus: string;
    totalAmount: number;
    bookingSource?: string;
    specialRequests?: string;
};

type Room = {
    id: string;
    roomNumber: number;
    roomStatus: string;
};

const STATUS: Record<string, { bg: string; border: string; label: string }> = {
    CONFIRMED:   { bg: '#3b82f6', border: '#2563eb', label: 'Confirmed' },
    PENDING:     { bg: '#f59e0b', border: '#d97706', label: 'Pending' },
    CHECKED_IN:  { bg: '#10b981', border: '#059669', label: 'Checked In' },
    CHECKED_OUT: { bg: '#8b5cf6', border: '#7c3aed', label: 'Checked Out' },
    CANCELLED:   { bg: '#9ca3af', border: '#6b7280', label: 'Cancelled' },
    COMPLETED:   { bg: '#6366f1', border: '#4f46e5', label: 'Completed' },
};

function toISO(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function RoomCalendar() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [rooms, setRooms]       = useState<Room[]>([]);
    const [loading, setLoading]   = useState(true);
    const [viewDate, setViewDate] = useState(() => new Date());
    const [selected, setSelected] = useState<Booking | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());

    const load = useCallback(() => {
        setLoading(true);
        const from = toISO(year, month, 1);
        const to   = toISO(year, month + 1, 1);
        Promise.all([
            api.get('/api/rooms?size=500').then(r => r.data),
            api.get(`/api/bookings?from=${from}&to=${to}`).then(r => r.data),
        ]).then(([rd, bd]) => {
            const roomList: Room[] = (Array.isArray(rd) ? rd : rd.content ?? [])
                .sort((a: Room, b: Room) => a.roomNumber - b.roomNumber);
            const bookingList: Booking[] = Array.isArray(bd) ? bd : bd.content ?? [];
            setRooms(roomList);
            setBookings(bookingList);
        }).catch(console.error)
          .finally(() => setLoading(false));
    }, [year, month]);

    useEffect(() => { load(); }, [load, year, month]);

    const monthStart = toISO(year, month, 1);
    const monthEnd   = toISO(year, month, daysInMonth);

    const visibleBookings = bookings.filter(b => {
        if (statusFilter !== 'ALL' && b.bookingStatus !== statusFilter) return false;
        return b.checkInDate <= monthEnd && b.checkOutDate > monthStart;
    });

    const byRoom = new Map<number, Booking[]>();
    visibleBookings.forEach(b => {
        const arr = byRoom.get(b.roomNumber) ?? [];
        arr.push(b);
        byRoom.set(b.roomNumber, arr);
    });

    function getBookingForDay(roomNumber: number, dayISO: string): Booking | undefined {
        return (byRoom.get(roomNumber) ?? []).find(
            b => b.checkInDate <= dayISO && b.checkOutDate > dayISO
        );
    }

    const monthName = viewDate.toLocaleString('en', { month: 'long', year: 'numeric' });

    let occupiedCells = 0;
    if (!loading) {
        rooms.forEach(r => {
            for (let d = 1; d <= daysInMonth; d++) {
                const b = getBookingForDay(r.roomNumber, toISO(year, month, d));
                if (b && b.bookingStatus !== 'CANCELLED') occupiedCells++;
            }
        });
    }
    const totalCells = rooms.length * daysInMonth;
    const occupancy  = totalCells > 0 ? Math.round((occupiedCells / totalCells) * 100) : 0;

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-500 text-lg">
            Loading calendar…
        </div>
    );

    return (
        <div className="p-4 space-y-4">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">📅 Room Booking Calendar</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {rooms.length} rooms · {occupancy}% occupancy this month
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        title="Filter by booking status"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="text-sm border rounded-lg px-2 py-1.5 bg-white shadow-sm"
                    >
                        <option value="ALL">All Statuses</option>
                        {Object.entries(STATUS).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>

                    <button type="button"
                            onClick={() => setViewDate(new Date(year, month - 1, 1))}
                            className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium">
                        ◀
                    </button>
                    <span className="font-semibold text-gray-700 min-w-[160px] text-center">{monthName}</span>
                    <button type="button"
                            onClick={() => setViewDate(new Date(year, month + 1, 1))}
                            className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium">
                        ▶
                    </button>
                    <button type="button"
                            onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
                            className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
                        Today
                    </button>
                </div>
            </div>

            {/* ── Legend ── */}
            <div className="flex flex-wrap gap-4">
                {Object.entries(STATUS).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className={styles.dot} data-status={k} />
                        {v.label}
                    </span>
                ))}
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className={styles.dot} data-status="TODAY" />
                    Today
                </span>
            </div>

            {/* ── Grid ── */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="border-collapse text-sm w-full">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-20 bg-gray-800 text-white text-xs font-semibold px-3 py-2 w-20 min-w-[80px] border-r border-gray-700">
                                ROOM
                            </th>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                                const iso = toISO(year, month, d);
                                const dow = new Date(year, month, d).getDay();
                                const isToday   = iso === todayISO;
                                const isWeekend = dow === 0 || dow === 6;
                                return (
                                    <th key={d}
                                        className={`text-center text-xs py-1.5 w-8 min-w-[32px] font-medium select-none
                                            ${isToday   ? 'bg-blue-600 text-white' :
                                              isWeekend ? 'bg-gray-700 text-gray-300' :
                                                          'bg-gray-800 text-gray-400'}`}>
                                        <div>{d}</div>
                                        <div className="text-[9px] opacity-70">
                                            {['Su','Mo','Tu','We','Th','Fr','Sa'][dow]}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {rooms.map((room, ri) => {
                            const cells: React.ReactNode[] = [];
                            let d = 1;

                            while (d <= daysInMonth) {
                                const iso     = toISO(year, month, d);
                                const booking = getBookingForDay(room.roomNumber, iso);

                                if (booking) {
                                    const endISO  = booking.checkOutDate <= monthEnd
                                        ? booking.checkOutDate
                                        : toISO(year, month + 1, 1);
                                    const span    = Math.max(1, daysBetween(iso, endISO));
                                    const isStart = booking.checkInDate === iso;
                                    const endsThisMonth = booking.checkOutDate <= monthEnd;
                                    const st      = STATUS[booking.bookingStatus] ?? STATUS.CONFIRMED;
                                    const nights  = daysBetween(booking.checkInDate, booking.checkOutDate);

                                    cells.push(
                                        <td key={d}
                                            colSpan={span}
                                            onClick={() => setSelected(booking)}
                                            title={`${booking.guestName} | ${booking.checkInDate} → ${booking.checkOutDate} | ${st.label}`}
                                            data-status={booking.bookingStatus}
                                            className={`${styles.bookingCell} ${endsThisMonth ? styles.bookingCellEnd : ''}`}>
                                            {isStart ? (
                                                <div>
                                                    <div className={styles.bookingName}>{booking.guestName}</div>
                                                    <div className={styles.bookingMeta}>
                                                        {nights}n · {st.label}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={styles.bookingContinue}>···</div>
                                            )}
                                        </td>
                                    );
                                    d += span;
                                } else {
                                    const dow       = new Date(year, month, d).getDay();
                                    const isToday   = iso === todayISO;
                                    const isWeekend = dow === 0 || dow === 6;
                                    cells.push(
                                        <td key={d}
                                            className={`${styles.emptyCell} ${
                                                isToday   ? styles.emptyCellToday :
                                                isWeekend ? styles.emptyCellWeekend :
                                                            styles.emptyCellNormal}`}>
                                        </td>
                                    );
                                    d++;
                                }
                            }

                            return (
                                <tr key={room.id}
                                    className={`border-b border-gray-100 ${ri % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                                    <td className="sticky left-0 z-10 bg-gray-100 border-r border-gray-300 px-2 py-1 text-center font-bold text-gray-700 text-sm">
                                        {room.roomNumber}
                                    </td>
                                    {cells}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── Booking Detail Modal ── */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                     onClick={() => setSelected(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
                         onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-bold text-gray-800">Booking Details</h2>
                            <button type="button"
                                    onClick={() => setSelected(null)}
                                    className="text-gray-400 hover:text-gray-700 text-2xl leading-none">
                                ×
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            {([
                                ['Guest',     selected.guestName],
                                ['Room',      `#${selected.roomNumber}`],
                                ['Check-in',  selected.checkInDate],
                                ['Check-out', selected.checkOutDate],
                                ['Nights',    String(daysBetween(selected.checkInDate, selected.checkOutDate))],
                                ['Total',     `€${selected.totalAmount?.toFixed(2) ?? '—'}`],
                                ['Source',    selected.bookingSource ?? '—'],
                            ] as [string, string][]).map(([label, val]) => (
                                <div key={label} className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500">{label}</span>
                                    <span className="font-medium text-gray-800">{val}</span>
                                </div>
                            ))}

                            <div className="flex justify-between items-center pt-1">
                                <span className="text-gray-500">Status</span>
                                <span className={styles.statusBadge}
                                      data-status={selected.bookingStatus}>
                                    {STATUS[selected.bookingStatus]?.label ?? selected.bookingStatus}
                                </span>
                            </div>

                            {selected.specialRequests && (
                                <div className="pt-2">
                                    <p className="text-gray-500 text-xs mb-1">Special Requests</p>
                                    <p className="text-gray-700 text-xs bg-gray-50 rounded p-2">{selected.specialRequests}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
