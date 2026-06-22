"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { Search, Filter } from "lucide-react";
import Link from "next/link";
import styles from "@/styles/SearchFilter.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface Room {
  id: string;
  roomNumber: number;
  floor: string;
  roomStatus: string;
  hotelName?: string;
  price?: number;
  roomType?: { name?: string; pricePerNight?: number; capacity?: number };
}

export default function SearchFilterPage() {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filtered, setFiltered] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  useEffect(() => {
    api.get("/api/rooms").then(r => {
      const data = Array.isArray(r.data) ? r.data : r.data?.content ?? [];
      setRooms(data);
      setFiltered(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = rooms;
    if (status !== "ALL") result = result.filter(r => r.roomStatus === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(r =>
        [String(r.roomNumber), r.hotelName, r.roomType?.name].some(v => (v ?? "").toLowerCase().includes(q))
      );
    }
    setFiltered(result);
  }, [rooms, search, status]);

  async function checkAvailability() {
    if (!checkIn || !checkOut) { alert("Select check-in and check-out dates."); return; }
    setLoading(true);
    try {
      const res = await api.get(`/api/bookings/rooms/availability?from=${checkIn}&to=${checkOut}`);
      const data = Array.isArray(res.data) ? res.data : [];
      const availableIds = new Set(data.filter((r: {bookedDates?: string[]}) => !r.bookedDates?.length).map((r: {roomId: string}) => r.roomId));
      setFiltered(rooms.filter(r => availableIds.has(r.id)));
    } catch {
      alert("Failed to check availability.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('roomSearchFilter')}</h1>
          <p className="page-subtitle">{t('roomSearchSubtitle')}</p>
        </div>
      </div>

      <div className={`data-card ${styles.filtersCard}`}>
        <div className="data-card-header">
          <span className="data-card-title"><Filter size={16} className={styles.filterIcon} />{t('filtersLabel')}</span>
        </div>
        <div className={styles.filters}>
          <div className="form-field">
            <label className="form-label" htmlFor="sf-search">{t('search')}</label>
            <div className="search-bar">
              <Search size={14} className="search-icon" />
              <input id="sf-search" className="search-input" placeholder={t('roomSearchPlaceholder')}
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="sf-status">{t('status')}</label>
            <select id="sf-status" className="form-input" title="Filter by room status"
              value={status} onChange={e => setStatus(e.target.value)}>
              <option value="ALL">{t('all')}</option>
              <option value="FREE">{t('freeStatus')}</option>
              <option value="OCCUPIED">{t('occupiedStatus')}</option>
              <option value="RESERVED">{t('reservedStatus')}</option>
              <option value="MAINTENANCE">{t('maintenance')}</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="sf-checkin">{t('checkIn')}</label>
            <input id="sf-checkin" type="date" className="form-input" title="Check-in date"
              placeholder="YYYY-MM-DD" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="sf-checkout">{t('checkOut')}</label>
            <input id="sf-checkout" type="date" className="form-input" title="Check-out date"
              placeholder="YYYY-MM-DD" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary" onClick={checkAvailability}>
            {t('checkAvailability')}
          </button>
          <button type="button" className="btn btn-secondary"
            onClick={() => { setSearch(""); setStatus("ALL"); setCheckIn(""); setCheckOut(""); setFiltered(rooms); }}>
            {t('resetLabel')}
          </button>
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{filtered.length} {t('roomsFound')}</span>
        </div>
        {loading ? (
          <div className="state-container"><div className="spinner" /><p className="state-title">{t('loading')}</p></div>
        ) : filtered.length === 0 ? (
          <div className="state-container"><div className="state-icon">🔍</div><p className="state-title">{t('noRoomsMatch')}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('room')}</th>
                  <th>{t('hotel')}</th>
                  <th>{t('type')}</th>
                  <th>{t('floor')}</th>
                  <th>{t('status')}</th>
                  <th>{t('pricePerNightHeader')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.roomNumber}</strong></td>
                    <td className="cell-muted">{r.hotelName ?? "—"}</td>
                    <td>{r.roomType?.name ?? "—"}</td>
                    <td className="cell-muted">{r.floor}</td>
                    <td><span className="badge">{r.roomStatus}</span></td>
                    <td>€{r.roomType?.pricePerNight ?? r.price ?? "—"}</td>
                    <td>
                      <Link href={`/add-bookings?roomId=${r.id}`} className="btn btn-primary btn-sm">{t('bookLabel')}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
