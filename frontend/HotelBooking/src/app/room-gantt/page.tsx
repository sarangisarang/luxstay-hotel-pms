"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type RoomAvail = {
    roomId: string;
    roomNumber: string;
    bookedDates: string[];
};

const DAYS_TO_SHOW = 45;
const CELL_W = 28;
const CELL_H = 32;
const LABEL_W = 72;

function toISO(d: Date) {
    return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

const DOW_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function RoomGanttPage() {
  const { t } = useTranslation();
    const [rooms, setRooms] = useState<RoomAvail[]>([]);
    const [loading, setLoading] = useState(true);
    const [startOffset, setStartOffset] = useState(-3);
    const scrollRef = useRef<HTMLDivElement>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    useEffect(() => {
        api.get("/api/rooms/availability")
            .then(r => {
                const data: RoomAvail[] = Array.isArray(r.data) ? r.data : r.data?.content ?? [];
                setRooms(data.sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true })));
            })
            .finally(() => setLoading(false));
    }, []);

    // Scroll to today on load
    useEffect(() => {
        if (!loading && scrollRef.current) {
            scrollRef.current.scrollLeft = Math.abs(startOffset) * CELL_W - 40;
        }
    }, [loading, startOffset]);

    const startDate = addDays(today, startOffset);
    const dates = Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(startDate, i));
    const dateSet = (room: RoomAvail) => new Set(room.bookedDates);

    function cellColor(date: Date, bookedSet: Set<string>): string {
        const iso = toISO(date);
        const isToday = toISO(date) === toISO(today);
        if (bookedSet.has(iso)) return isToday ? "#4f46e5" : "#818cf8";
        if (isToday) return "#fde68a";
        const dow = date.getDay();
        if (dow === 0 || dow === 6) return "#f3f4f6";
        return "#ffffff";
    }

    function cellBorder(date: Date): string {
        const isToday = toISO(date) === toISO(today);
        if (isToday) return "2px solid #f59e0b";
        return "1px solid #e5e7eb";
    }

    if (loading) return (
        <div className="state-container"><div className="spinner" /><p className="state-sub">{t('loadingRoomAvailability', 'Loading room availability…')}</p></div>
    );

    const totalBooked = rooms.reduce((sum, r) => {
        const s = dateSet(r);
        return sum + dates.filter(d => s.has(toISO(d))).length;
    }, 0);
    const totalCells = rooms.length * dates.length;
    const occupancyPct = totalCells > 0 ? ((totalBooked / totalCells) * 100).toFixed(1) : "0";

    return (
        <div className="page-wrapper fade-in" style={{ maxWidth: "100%" }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('roomGantt', 'Room Availability Gantt')}</h1>
                    <p className="page-subtitle">
                        {rooms.length} {t('rooms')} · {DAYS_TO_SHOW} {t('days', 'days')} · {occupancyPct}% {t('avgOccupancy', 'avg occupancy in view')}
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn-secondary"
                        onClick={() => setStartOffset(o => o - 14)}>← −2 Weeks</button>
                    <button type="button" className="btn-primary"
                        onClick={() => setStartOffset(-3)}>{t('today')}</button>
                    <button type="button" className="btn-secondary"
                        onClick={() => setStartOffset(o => o + 14)}>+2 Weeks →</button>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: "0.78rem", alignItems: "center" }}>
                {[
                    { bg: "#818cf8", label: "Booked" },
                    { bg: "#4f46e5", label: "Booked (today)" },
                    { bg: "#fde68a", label: "Today (free)" },
                    { bg: "#f3f4f6", label: "Weekend (free)" },
                    { bg: "#ffffff", label: "Free", border: "1px solid #d1d5db" },
                ].map(({ bg, label, border }) => (
                    <span key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 16, height: 16, borderRadius: 3, background: bg, border: border ?? "1px solid #e5e7eb", display: "inline-block" }} />
                        {label}
                    </span>
                ))}
            </div>

            {/* Gantt grid */}
            <div
                ref={scrollRef}
                style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
            >
                <div style={{ minWidth: LABEL_W + CELL_W * DAYS_TO_SHOW }}>
                    {/* Header row — dates */}
                    <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 10, background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                        <div style={{ width: LABEL_W, minWidth: LABEL_W, padding: "0 8px", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", display: "flex", alignItems: "center", borderRight: "2px solid #e5e7eb" }}>
                            ROOM
                        </div>
                        {dates.map(d => {
                            const isToday = toISO(d) === toISO(today);
                            const dow = d.getDay();
                            return (
                                <div
                                    key={toISO(d)}
                                    style={{
                                        width: CELL_W, minWidth: CELL_W, height: CELL_H + 12,
                                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                        background: isToday ? "#fef3c7" : dow === 0 || dow === 6 ? "#f3f4f6" : "#f9fafb",
                                        borderRight: "1px solid #e5e7eb",
                                        fontSize: "0.62rem", fontWeight: isToday ? 800 : 600,
                                        color: isToday ? "#d97706" : dow === 0 || dow === 6 ? "#9ca3af" : "#374151",
                                    }}
                                >
                                    <span>{DOW_SHORT[dow]}</span>
                                    <span>{d.getDate()}</span>
                                    {d.getDate() === 1 && (
                                        <span style={{ fontSize: "0.55rem", color: "#6366f1", fontWeight: 800 }}>
                                            {MONTH_SHORT[d.getMonth()]}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Room rows */}
                    {rooms.map((room, ri) => {
                        const booked = dateSet(room);
                        return (
                            <div
                                key={room.roomId}
                                style={{
                                    display: "flex",
                                    background: ri % 2 === 0 ? "#ffffff" : "#fafafa",
                                    borderBottom: "1px solid #f1f5f9",
                                }}
                            >
                                {/* Room number label */}
                                <div style={{
                                    width: LABEL_W, minWidth: LABEL_W,
                                    height: CELL_H, display: "flex", alignItems: "center",
                                    padding: "0 8px", fontSize: "0.78rem", fontWeight: 700,
                                    color: "#374151", borderRight: "2px solid #e5e7eb",
                                    position: "sticky", left: 0, background: "inherit",
                                }}>
                                    #{room.roomNumber}
                                </div>

                                {/* Date cells */}
                                {dates.map(d => {
                                    const iso = toISO(d);
                                    const isBooked = booked.has(iso);
                                    return (
                                        <a
                                            key={iso}
                                            href={`/add-bookings?room=${room.roomId}&date=${iso}`}
                                            title={`Room ${room.roomNumber} — ${iso} — ${isBooked ? "Booked" : "Free"}`}
                                            style={{
                                                width: CELL_W, minWidth: CELL_W, height: CELL_H,
                                                display: "block",
                                                background: cellColor(d, booked),
                                                border: cellBorder(d),
                                                cursor: isBooked ? "not-allowed" : "pointer",
                                                transition: "filter 80ms",
                                            }}
                                            onClick={e => { if (isBooked) e.preventDefault(); }}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            <p style={{ marginTop: 10, fontSize: "0.75rem", color: "#9ca3af" }}>
                Click any free cell to create a booking for that room and date. Scroll horizontally to see more dates.
            </p>
        </div>
    );
}
