"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import HotelImage from "@/components/tables/HotelImage";
import { Search, Plus, Pencil, Trash2, Star, X, RefreshCw, MapPin, BedDouble, ChevronDown, ChevronUp, Phone, Mail } from "lucide-react";
import mapStyles from "@/styles/HotelMap.module.css";
import s from "@/styles/HotelList.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

const HotelMap = dynamic(() => import("@/components/ui/HotelMap"), { ssr: false });

interface Hotel {
  id: string;
  name: string;
  address: string;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  rating?: number | null;
  imageName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface RoomType {
  id?: string;
  name: string;
  pricePerNight?: number | null;
  imageUrl?: string | null;
}

interface Room {
  id: string;
  roomNumber: number;
  floor?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  roomStatus: string;
  hotelId?: string | null;
  hotelName?: string | null;
  roomType?: RoomType | null;
  roomTypeId?: string | null;
}

type EditForm = {
  name: string; address: string; city: string; country: string;
  phone: string; email: string; description: string; rating: string;
};

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const d = data as Record<string, unknown>;
  if (d && Array.isArray(d.content)) return d.content as T[];
  return [];
}

function parseRating(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(",", "."));
  if (!isFinite(n)) return null;
  return Math.max(0, Math.min(5, n));
}

function StarRating({ r }: { r: number | null | undefined }) {
  if (r == null) return <span className="cell-muted">—</span>;
  return (
    <span className="cell-with-icon">
      <Star size={13} className="icon-gold" />
      <span className="cell-mono">{r.toFixed(1)}</span>
    </span>
  );
}

const STATUS_CLASS: Record<string, string> = {
  FREE:        s.statusFree,
  OCCUPIED:    s.statusOccupied,
  RESERVED:    s.statusReserved,
  MAINTENANCE: s.statusMaintenance,
};

function RoomStatusBadge({ status }: { status: string }) {
  return (
    <span className={`${s.statusBadge} ${STATUS_CLASS[status] ?? s.statusMaintenance}`}>
      {status}
    </span>
  );
}

function HotelInfoCard({ hotel, fallbackImgSrc }: { hotel: Hotel; fallbackImgSrc: string | null }) {
  const imgSrc = hotel.imageName
    ? (hotel.imageName.startsWith("http")
        ? hotel.imageName
        : `${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080"}/uploads/${hotel.imageName}`)
    : fallbackImgSrc;

  const stars = typeof hotel.rating === "number" ? hotel.rating : null;

  return (
    <div className={s.hotelInfoCard}>
      <div className={s.hotelInfoImg}>
        {imgSrc
          ? <img src={imgSrc} alt={hotel.name} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          : null}
      </div>
      <div className={s.hotelInfoDetails}>
        <div className={s.hotelInfoName}>{hotel.name}</div>
        <div className={s.hotelInfoMeta}>
          {(hotel.city || hotel.country) && (
            <span className={s.hotelInfoLocation}>
              📍 {[hotel.city, hotel.country].filter(Boolean).join(", ")}
            </span>
          )}
          {stars !== null && (
            <span className={s.hotelInfoRating}>
              <Star size={12} /> {stars.toFixed(1)}
            </span>
          )}
        </div>
        {hotel.description && (
          <div className={s.hotelInfoDesc}>{hotel.description}</div>
        )}
        <div className={s.hotelInfoContacts}>
          {hotel.address && (
            <span className={s.hotelInfoContact}>📌 {hotel.address}</span>
          )}
          {hotel.phone && (
            <span className={s.hotelInfoContact}><Phone size={11} /> {hotel.phone}</span>
          )}
          {hotel.email && (
            <span className={s.hotelInfoContact}><Mail size={11} /> {hotel.email}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function HotelRoomsPanel({ hotel, rooms, isAdmin }: { hotel: Hotel; rooms: Room[]; isAdmin: boolean }) {
  const { t } = useTranslation();
  const hotelRooms = useMemo(
    () => rooms.filter(r => r.hotelId === hotel.id).sort((a, b) => a.roomNumber - b.roomNumber),
    [rooms, hotel.id]
  );

  // Best image from rooms to use as hotel fallback
  const fallbackImgSrc = useMemo(() => {
    for (const r of hotelRooms) {
      const img = r.imageUrl ?? r.roomType?.imageUrl;
      if (img) return img.startsWith("http") ? img : `http://localhost:8080/${img}`;
    }
    return null;
  }, [hotelRooms]);

  if (hotelRooms.length === 0) {
    return (
      <>
        <HotelInfoCard hotel={hotel} fallbackImgSrc={null} />
        <div className={s.noRooms}>
          {t('noRoomsAssigned', 'No rooms assigned to this hotel yet.')}
          {isAdmin && (
            <Link href="/add-room" className={s.noRoomsLink}> + {t('addRoom')}</Link>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <HotelInfoCard hotel={hotel} fallbackImgSrc={fallbackImgSrc} />
      <div className={s.roomsPanelBody}>
      <div className={s.roomsGrid}>
        {hotelRooms.map(room => {
          const typeName = room.roomType?.name ?? "—";
          const price    = room.roomType?.pricePerNight;
          const img      = room.imageUrl ?? room.roomType?.imageUrl;
          const imgSrc   = img
            ? (img.startsWith("http") ? img : `http://localhost:8080/${img}`)
            : null;

          return (
            <div key={room.id} className={s.roomCard}>
              <div className={s.roomThumb}>
                {imgSrc
                  ? <img src={imgSrc} alt={`Room ${room.roomNumber}`} />
                  : <div className={s.roomThumbEmpty}><BedDouble size={28} /></div>
                }
                <span className={s.roomTypeBadge}>{typeName}</span>
                <span className={s.roomStatusBadge}><RoomStatusBadge status={room.roomStatus} /></span>
              </div>

              <div className={s.roomInfo}>
                <div className={s.roomTitle}>
                  {t('room')} {room.roomNumber}
                  {room.floor && <span className={s.roomFloor}> · {t('floor')} {room.floor}</span>}
                </div>
                {room.description && <div className={s.roomDesc}>{room.description}</div>}
                {price != null && (
                  <div className={s.roomPrice}>
                    €{price.toFixed(2)}<span className={s.roomPriceUnit}>{t('perNight')}</span>
                  </div>
                )}
              </div>

              <div className={s.roomFooter}>
                <Link href={`/rooms/edit/${room.id}`} className={s.roomEditLink}>
                  <Pencil size={11} /> {t('editRoom')}
                </Link>
              </div>
            </div>
          );
        })}

        {/* Add room card — admin only */}
        {isAdmin && (
          <Link href="/add-room" className={s.addRoomCard}>
            <Plus size={22} />
            <span className={s.addRoomLabel}>{t('addRoom')}</span>
          </Link>
        )}
      </div>
      </div>
    </>
  );
}

export default function HotelList() {
  const { t } = useTranslation();
  const [hotels,     setHotels]     = useState<Hotel[]>([]);
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userRole,   setUserRole]   = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setUserRole(localStorage.getItem("role"));
  }, []);

  const isAdmin = userRole === "ADMIN";

  const [mapHotelId,   setMapHotelId]   = useState<string | null>(null);
  const [roomsHotelId, setRoomsHotelId] = useState<string | null>(null);
  const [editing,  setEditing]  = useState<Hotel | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editErr,  setEditErr]  = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "", address: "", city: "", country: "", phone: "", email: "", description: "", rating: "",
  });

  const roomCountByHotel = useMemo(() => {
    const m: Record<string, number> = {};
    rooms.forEach(r => { if (r.hotelId) m[r.hotelId] = (m[r.hotelId] ?? 0) + 1; });
    return m;
  }, [rooms]);

  // Best image src per hotel — used as fallback thumb when hotel has no uploaded image
  const roomImgByHotel = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of rooms) {
      if (!r.hotelId || m[r.hotelId]) continue;
      const img = r.imageUrl ?? r.roomType?.imageUrl;
      if (img) m[r.hotelId] = img.startsWith("http") ? img : `http://localhost:8080/${img}`;
    }
    return m;
  }, [rooms]);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [hRes, rRes] = await Promise.all([
        api.get("/api/hotels"),
        api.get("/api/rooms"),
      ]);
      setHotels(normalizeList<Hotel>(hRes.data));
      setRooms(normalizeList<Room>(rRes.data));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter(h =>
      [h.name, h.address, h.phone, h.email, h.description, h.city, h.country]
        .some(v => (v ?? "").toLowerCase().includes(q))
    );
  }, [hotels, search]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete hotel "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/hotels/${id}`);
      setHotels(prev => prev.filter(h => h.id !== id));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      alert(err?.response?.data?.message ?? err?.message ?? "Failed to delete hotel.");
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(h: Hotel) {
    setEditing(h);
    setEditErr(null);
    setEditForm({
      name:        h.name        ?? "",
      address:     h.address     ?? "",
      city:        h.city        ?? "",
      country:     h.country     ?? "",
      phone:       h.phone       ?? "",
      email:       h.email       ?? "",
      description: h.description ?? "",
      rating:      typeof h.rating === "number" ? String(h.rating) : "",
    });
  }

  function closeEdit() { setEditing(null); setEditErr(null); setSavingId(null); }

  function onEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setEditForm(p => ({ ...p, [name]: value }));
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      name:        editForm.name.trim(),
      address:     editForm.address.trim(),
      city:        editForm.city.trim()        || null,
      country:     editForm.country.trim()     || null,
      phone:       editForm.phone.trim()       || null,
      email:       editForm.email.trim()       || null,
      description: editForm.description.trim() || null,
      rating:      parseRating(editForm.rating),
    };
    if (!payload.name || !payload.address) { setEditErr("Name and Address are required."); return; }
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) { setEditErr("Please enter a valid email."); return; }
    if (payload.rating !== null && (payload.rating < 0 || payload.rating > 5)) { setEditErr("Rating must be 0–5."); return; }
    setSavingId(editing.id);
    setEditErr(null);
    try {
      const res = await api.put(`/api/hotels/${editing.id}`, payload);
      const updated = res?.data && typeof res.data === "object" ? res.data as Hotel : null;
      setHotels(prev => prev.map(h => {
        if (h.id !== editing.id) return h;
        const merged = updated ? { ...h, ...updated } : { ...h, ...payload };
        if (!merged.imageName && h.imageName) merged.imageName = h.imageName;
        return merged;
      }));
      closeEdit();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setEditErr(err?.response?.data?.message ?? err?.message ?? "Failed to update hotel.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return (
    <div className="state-container">
      <div className="spinner" />
      <p className="state-title">{t('loadingHotels')}</p>
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
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('hotels')}</h1>
          <p className="page-subtitle">
            {hotels.length} {t('properties', 'properties')} · {rooms.length} {t('rooms')} {t('total')}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-secondary" onClick={fetchAll} title="Refresh">
            <RefreshCw size={14} /> {t('refresh')}
          </button>
          {isAdmin && (
            <Link href="/add-hotel" className="btn btn-primary">
              <Plus size={15} /> {t('addHotel')}
            </Link>
          )}
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{t('allHotels')}</span>
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder={t('searchHotels')}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="state-container">
            <div className="state-icon">🏨</div>
            <p className="state-title">{t('noHotels')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('image')}</th>
                  <th>{t('hotel')}</th>
                  <th>{t('location')}</th>
                  <th>{t('contact')}</th>
                  <th>{t('rating')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(hotel => {
                  const roomCount = roomCountByHotel[hotel.id] ?? 0;
                  const roomsOpen = roomsHotelId === hotel.id;
                  const mapOpen   = mapHotelId   === hotel.id;

                  return (
                    <Fragment key={hotel.id}>
                      <tr>
                        <td>
                          {hotel.imageName
                            ? <HotelImage imageName={hotel.imageName} alt={hotel.name} className="hotel-thumb" />
                            : roomImgByHotel[hotel.id]
                              ? <img src={roomImgByHotel[hotel.id]} alt={hotel.name}
                                     className={`hotel-thumb ${s.thumbFallbackImg}`} />
                              : <div className="hotel-thumb-empty">No image</div>
                          }
                        </td>
                        <td>
                          <div className="cell-name">{hotel.name}</div>
                          <div className="cell-sub">{hotel.description || t('noDescription')}</div>
                        </td>
                        <td>
                          <div className="cell-muted">{hotel.address || "—"}</div>
                          {(hotel.city || hotel.country) && (
                            <div className="cell-location">
                              📍 {[hotel.city, hotel.country].filter(Boolean).join(", ")}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="cell-sub">{hotel.phone || "—"}</div>
                          <div className="cell-sub">{hotel.email || "—"}</div>
                        </td>
                        <td><StarRating r={hotel.rating} /></td>
                        <td>
                          <div className="cell-actions">
                            <button type="button"
                              className={`btn btn-sm ${roomsOpen ? "btn-primary" : "btn-secondary"}`}
                              onClick={() => setRoomsHotelId(prev => prev === hotel.id ? null : hotel.id)}
                              title="Show rooms">
                              <BedDouble size={13} />
                              <span className={s.roomCountBadge}>{roomCount}</span>
                              {roomsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm"
                              onClick={() => setMapHotelId(prev => prev === hotel.id ? null : hotel.id)}
                              title="Show on map">
                              <MapPin size={13} />
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm"
                              onClick={() => openEdit(hotel)} title="Edit hotel">
                              <Pencil size={13} />
                            </button>
                            <button type="button" className="btn btn-danger btn-sm"
                              disabled={deletingId === hotel.id}
                              onClick={() => handleDelete(hotel.id, hotel.name)} title="Delete hotel">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {roomsOpen && (
                        <tr key={`rooms-${hotel.id}`} className={s.roomsPanelRow}>
                          <td colSpan={6}>
                            <div className={s.roomsPanelBorder}>
                              <div className={s.roomsPanelHeader}>
                                <span className={s.roomsPanelTitle}>
                                  🛏️ {hotel.name} — Rooms ({roomCount})
                                </span>
                              </div>
                              <HotelRoomsPanel hotel={hotel} rooms={rooms} isAdmin={isAdmin} />
                            </div>
                          </td>
                        </tr>
                      )}

                      {mapOpen && (
                        <tr key={`map-${hotel.id}`} className={mapStyles.mapRow}>
                          <td colSpan={6}>
                            <HotelMap
                              name={hotel.name}
                              address={hotel.address}
                              latitude={hotel.latitude}
                              longitude={hotel.longitude}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="modal-title">Edit Hotel</p>
                <p className="modal-sub">PUT /api/hotels/{editing.id}</p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={closeEdit} title="Close">
                <X size={14} />
              </button>
            </div>

            {editErr && <div className="feedback-error modal-feedback"><span>{editErr}</span></div>}

            <form onSubmit={handleUpdate} className="modal-body">
              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label" htmlFor="eh-name">Name *</label>
                  <input id="eh-name" name="name" className="form-input" placeholder="Hotel name"
                    value={editForm.name} onChange={onEditChange} required />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="eh-address">Address *</label>
                  <input id="eh-address" name="address" className="form-input" placeholder="Street address"
                    value={editForm.address} onChange={onEditChange} required />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="eh-country">Country</label>
                  <input id="eh-country" name="country" className="form-input" placeholder="e.g. Georgia"
                    value={editForm.country} onChange={onEditChange} />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="eh-city">City</label>
                  <input id="eh-city" name="city" className="form-input" placeholder="e.g. Tbilisi"
                    value={editForm.city} onChange={onEditChange} />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="eh-phone">{t('phone')}</label>
                  <input id="eh-phone" name="phone" className="form-input" placeholder="+1 555 000 0000"
                    value={editForm.phone} onChange={onEditChange} />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="eh-email">{t('email')}</label>
                  <input id="eh-email" name="email" type="email" className="form-input" placeholder="info@hotel.com"
                    value={editForm.email} onChange={onEditChange} />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="eh-rating">Rating (0–5)</label>
                  <input id="eh-rating" name="rating" className="form-input" inputMode="decimal" placeholder="e.g. 4.5"
                    value={editForm.rating} onChange={onEditChange} />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="eh-desc">{t('description')}</label>
                <textarea id="eh-desc" name="description" className="form-textarea" rows={3}
                  placeholder="Short description of the hotel…"
                  value={editForm.description} onChange={onEditChange} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeEdit}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={savingId === editing.id}>
                  {savingId === editing.id ? t('working') : t('saveChanges', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
