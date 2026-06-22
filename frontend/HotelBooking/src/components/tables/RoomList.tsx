"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import { getImageUrl } from "@/utils/imageHelper";
import { Search, Plus, Pencil, Trash2, BedDouble } from "lucide-react";
import Link from "next/link";
import AiInsightCard from "@/components/AiInsightCard";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface Room {
  id: string;
  roomNumber: number;
  floor: string;
  roomTypeId: string;
  hotelName: string;
  price: number;
  roomStatus: string;
  description: string;
  imageUrl: string;
}

interface RoomType {
  id: string;
  name: string;
  imageUrl: string;
  pricePerNight?: number;
  [key: string]: unknown;
}

const STATUS_CLASS: Record<string, string> = {
  AVAILABLE:   "badge-success",
  OCCUPIED:    "badge-danger",
  MAINTENANCE: "badge-warn",
  RESERVED:    "badge-info",
};

const AMENITY_ICONS: Record<string, string> = {
  airConditioning: "❄️", internet: "🌐", toilet: "🚽", bed: "🛏️", tv: "📺",
  balcony: "🌇", minibar: "🥂", heating: "🔥", safe: "🔐", hairDryer: "💇",
  roomService: "🛎️", soundproofing: "🔇", freeWifi: "📶", fitnessCentre: "🏋️",
  flatScreenTv: "📽️", nonSmokingRoom: "🚭", shower: "🚿", towels: "🧻",
  desk: "🪑", cityView: "🏙️", electricKettle: "☕",
};

function fmtMoney(n: number | null | undefined) {
  if (n == null || !isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function AmenityChips({ rt }: { rt: RoomType }) {
  const active = Object.entries(AMENITY_ICONS)
    .filter(([key]) => rt[key])
    .slice(0, 6);
  if (active.length === 0) return <span className="cell-muted">—</span>;
  return (
    <div className="amenity-chips">
      {active.map(([key, icon]) => (
        <span key={key} className="amenity-chip" title={key.replace(/([A-Z])/g, " $1").trim()}>
          {icon}
        </span>
      ))}
    </div>
  );
}

export default function RoomList() {
  const { t } = useTranslation();
  const router = useRouter();
  const [rooms,     setRooms]     = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState("");
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [isAdmin,   setIsAdmin]   = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setIsAdmin(localStorage.getItem("role") === "ADMIN");
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [r1, r2] = await Promise.all([api.get("/api/rooms"), api.get("/api/room-types")]);
        if (!alive) return;
        setRooms(Array.isArray(r1.data) ? r1.data : (r1.data?.content ?? []));
        setRoomTypes(Array.isArray(r2.data) ? r2.data : (r2.data?.content ?? []));
      } catch (e: unknown) {
        const err = e as { message?: string };
        if (alive) setError(err?.message ?? "Failed to load rooms.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const rtMap = useMemo(() => {
    const m = new Map<string, RoomType>();
    for (const rt of roomTypes) m.set(rt.id, rt);
    return m;
  }, [roomTypes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(r => {
      const rt = rtMap.get(r.roomTypeId);
      return [String(r.roomNumber), r.hotelName, r.roomStatus, rt?.name ?? ""].some(v =>
        v.toLowerCase().includes(q)
      );
    });
  }, [rooms, rtMap, search]);

  async function handleDelete(id: string) {
    if (!confirm(t('deleteRoomConfirm'))) return;
    setDeleting(id);
    try {
      await api.delete(`/api/rooms/${id}`);
      setRooms(prev => prev.filter(r => r.id !== id));
    } catch { alert("Failed to delete room."); }
    finally { setDeleting(null); }
  }

  if (loading) return (
    <div className="state-container">
      <div className="spinner" />
      <p className="state-title">{t('loadingRooms')}</p>
    </div>
  );

  if (error) return (
    <div className="state-container">
      <div className="state-icon">⚠️</div>
      <p className="state-title">{t('error', 'Error')}</p>
      <p className="state-sub">{error}</p>
    </div>
  );

  return (
    <div className="fade-in">
      <AiInsightCard endpoint="/api/ai/insights/dashboard" title={t('aiRoomStatusOverview')} compact />
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('rooms')}</h1>
          <p className="page-subtitle">{rooms.length} {t('rooms')}</p>
        </div>
        <div className="page-actions">
          {isAdmin && (
            <Link href="/add-room" className="btn btn-primary">
              <Plus size={15} /> {t('addRoom')}
            </Link>
          )}
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{t('allRooms')}</span>
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder={t('searchRooms')}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="state-container">
            <div className="state-icon"><BedDouble size={28} /></div>
            <p className="state-title">{t('noRooms')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('image')}</th>
                  <th>{t('room')}</th>
                  <th>{t('type')}</th>
                  <th>{t('hotel')}</th>
                  <th>{t('price')}</th>
                  <th>{t('status')}</th>
                  <th>{t('amenities')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(room => {
                  const rt = rtMap.get(room.roomTypeId);
                  const imgSrc = getImageUrl(room.imageUrl, "room") || getImageUrl(rt?.imageUrl as string, "roomtype");
                  const price = room.price ?? rt?.pricePerNight ?? null;
                  return (
                    <tr key={room.id}>
                      <td>
                        {imgSrc ? (
                          <img src={imgSrc} alt={rt?.name ?? `Room ${room.roomNumber}`}
                            className="hotel-thumb" loading="lazy" />
                        ) : (
                          <div className="hotel-thumb-empty">No img</div>
                        )}
                      </td>
                      <td>
                        <div className="cell-name">#{room.roomNumber}</div>
                        <div className="cell-sub">{t('floor')} {room.floor}</div>
                      </td>
                      <td>{rt?.name ?? <span className="cell-muted">—</span>}</td>
                      <td className="cell-muted">{room.hotelName || "—"}</td>
                      <td className="cell-mono">{fmtMoney(price)}</td>
                      <td>
                        <span className={`badge ${STATUS_CLASS[room.roomStatus?.toUpperCase()] ?? "badge-neutral"}`}>
                          {room.roomStatus ? t(`${room.roomStatus.toUpperCase()}Status` as never, room.roomStatus) : "—"}
                        </span>
                      </td>
                      <td>{rt ? <AmenityChips rt={rt} /> : <span className="cell-muted">—</span>}</td>
                      <td>
                        <div className="cell-actions">
                          <button type="button" className="btn btn-secondary btn-sm"
                            onClick={() => router.push(`/rooms/edit/${room.id}`)} title={t('editRoom')}>
                            <Pencil size={13} />
                          </button>
                          <button type="button" className="btn btn-danger btn-sm"
                            disabled={deleting === room.id}
                            onClick={() => handleDelete(room.id)} title={t('deleteRoom')}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
