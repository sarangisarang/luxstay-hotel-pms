"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

// ---------------------------------------------
// Helpers (no external libraries)
// ---------------------------------------------
function toLocalISO(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
    // returns last day of month (local)
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, n: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + n, date.getDate());
}

// add: next-day helper for checkout prefill
function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function monthRange(date: Date): { from: string; to: string } {
    const from = startOfMonth(date);
    const toExclusive = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { from: toLocalISO(from), to: toLocalISO(toExclusive) };
}

function getMonthMatrix(date: Date): { weeks: Date[][]; monthLabel: string } {
    const first = startOfMonth(date);
    const last = endOfMonth(date);
    const firstDay = new Date(first); // copy
    const weekday = firstDay.getDay();
    // In JS: 0=Sunday, 1=Monday,... If you want Monday-first grid, shift indices
    const weekStartOffset = (weekday + 6) % 7; // make Monday=0
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - weekStartOffset);

    const weeks: Date[][] = [];
    for (let w = 0; w < 6; w++) {
        const row: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(gridStart);
            d.setDate(gridStart.getDate() + w * 7 + i);
            row.push(d);
        }
        weeks.push(row);
    }

    const monthLabel = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
    }).format(first);

    return { weeks, monthLabel };
}

// ---------------------------------------------
// Types
// ---------------------------------------------

type Availability = {
    roomId: string;
    roomNumber: string;
    bookedDates: string[]; // "YYYY-MM-DD"
};

// ---------------------------------------------
// UI
// ---------------------------------------------
export default function Page() {
  const { t } = useTranslation();
    const router = useRouter();
    const [activeMonth, setActiveMonth] = useState<Date>(startOfMonth(new Date()));
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [rooms, setRooms] = useState<Availability[]>([]);

    const range = useMemo(() => monthRange(activeMonth), [activeMonth]);
    const { weeks, monthLabel } = useMemo(() => getMonthMatrix(activeMonth), [activeMonth]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<Availability[]>("/api/rooms/availability", {
                params: { from: range.from, to: range.to },
            });
            const data = Array.isArray(res.data) ? res.data : [];
            const norm = data.map((r) => ({
                ...r,
                bookedDates: (r.bookedDates || []).map(String),
            }));
            setRooms(norm);
        } catch (e: any) {
            console.error(e);
            const msg = e?.response?.data?.message || e?.message || "Failed to load availability.";
            setError(msg);
            setRooms([]);
        } finally {
            setLoading(false);
        }
    }, [range.from, range.to]);

    useEffect(() => {
        load();
    }, [load]);

    const goPrev = () => setActiveMonth((d) => startOfMonth(addMonths(d, -1)));
    const goNext = () => setActiveMonth((d) => startOfMonth(addMonths(d, 1)));
    const goToday = () => setActiveMonth(startOfMonth(new Date()));

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">📅 {t('roomAvailability')}</h1>
                    <p className="text-sm text-gray-600">{t('rangeLabel')} <b>{range.from}</b> → <b>{range.to}</b></p>
                </div>
                <div className="flex gap-2">
                    <button onClick={goPrev} className="px-3 py-2 rounded-2xl shadow bg-white hover:bg-gray-50">{t('prevMonth')}</button>
                    <button onClick={goToday} className="px-3 py-2 rounded-2xl shadow bg-white hover:bg-gray-50">{t('today')}</button>
                    <button onClick={goNext} className="px-3 py-2 rounded-2xl shadow bg-white hover:bg-gray-50">{t('nextMonth')}</button>
                </div>
            </header>

            {loading && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">{t('loadingCalendar')}</div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 mb-6">{error}</div>
            )}

            {!loading && rooms.length === 0 && !error && (
                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100">{t('noRoomsFound')}</div>
            )}

            {!loading && rooms.map((room) => (
                <div key={room.roomId} className="mb-10 border p-4 rounded-2xl shadow bg-white">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">🛏️ {t('room')} {room.roomNumber}</h2>
                        <div className="text-xs flex gap-3 items-center">
                            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 inline-block rounded bg-red-400"/> {t('bookedLabel')}</span>
                            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 inline-block rounded bg-green-400"/> {t('freeLabel')}</span>
                        </div>
                    </div>

                    <div className="mb-2 text-sm text-gray-700">{monthLabel}</div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-1">
                        {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const).map((dayKey) => (
                            <div key={dayKey} className="py-1">{t(dayKey).slice(0, 3)}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {weeks.flat().map((date, idx) => {
                            const inMonth = date.getMonth() === activeMonth.getMonth();
                            const key = toLocalISO(date);
                            const isBooked = room.bookedDates.includes(key);

                            const handleClick = () => {
                                if (isBooked) return;
                                const checkIn = key;
                                const checkOut = toLocalISO(addDays(new Date(key), 1)); // [in, out)
                                const q = new URLSearchParams({
                                    roomId: room.roomId,
                                    roomNumber: String(room.roomNumber ?? ""),
                                    checkInDate: checkIn,
                                    checkOutDate: checkOut,
                                }).toString();
                                router.push(`/bookings/new?${q}`);
                            };

                            return (
                                <div
                                    key={idx}
                                    onClick={handleClick}
                                    className={[
                                        "aspect-square rounded-md border text-sm flex items-center justify-center select-none",
                                        inMonth ? "" : "opacity-40",
                                        isBooked ? "bg-red-400 text-white border-red-300 cursor-not-allowed" : "bg-green-50 text-gray-800 border-green-100 hover:bg-green-100 cursor-pointer",
                                    ].join(" ")}
                                    title={`${key} ${isBooked ? `(${t('bookedLabel')})` : `(${t('freeLabel')})`}`}
                                    aria-disabled={isBooked}
                                >
                                    {date.getDate()}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
