"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { BedDouble, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Hotel    = { id: string; name: string };
type RoomType = { id: string; name: string; imageUrl?: string };

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080").replace(/\/+$/, "");

function toPublicImageUrl(raw?: string): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const file = (raw.split("/").pop() ?? raw).trim();
  return `${API_BASE}/uploads/roomtype/${file}`;
}

const ROOM_STATUSES = [
  { value: "FREE",        label: "Free" },
  { value: "RESERVED",   label: "Reserved" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

export default function AddRoom() {
  const { t } = useTranslation();
  const router = useRouter();
  const [hotels,    setHotels]    = useState<Hotel[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  const [roomNumber,  setRoomNumber]  = useState("");
  const [roomStatus,  setRoomStatus]  = useState("FREE");
  const [hotelId,     setHotelId]     = useState("");
  const [roomTypeId,  setRoomTypeId]  = useState("");
  const [floor,       setFloor]       = useState("");
  const [description, setDescription] = useState("");
  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [previewImg,  setPreviewImg]  = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [hRes, rtRes] = await Promise.all([api.get("/api/hotels"), api.get("/api/room-types")]);
        if (!alive) return;
        const rts: RoomType[] = (Array.isArray(rtRes.data) ? rtRes.data : rtRes.data?.content ?? [])
          .map((t: RoomType) => ({ ...t, imageUrl: toPublicImageUrl(t.imageUrl) }));
        setHotels(Array.isArray(hRes.data) ? hRes.data : (hRes.data?.content ?? []));
        setRoomTypes(rts);
      } catch { /* non-critical */ }
    }
    load();
    return () => { alive = false; };
  }, []);

  function handleRoomTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setRoomTypeId(id);
    const rt = roomTypes.find(t => t.id === id);
    setPreviewImg(rt?.imageUrl ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const rn = parseInt(roomNumber, 10);
    if (!roomNumber || isNaN(rn)) { setError("Room number must be a valid integer."); return; }
    if (!hotelId || !roomTypeId)  { setError("Please select both hotel and room type."); return; }
    setLoading(true);
    try {
      const saveRes = await api.post("/api/rooms/save", {
        roomNumber: rn, roomStatus, hotelId, roomTypeId, floor, description, imageUrl: "",
      });
      const roomId: string = saveRes.data?.id;
      if (!roomId) throw new Error("Room saved but ID missing in response.");
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        await api.post(`/api/rooms/${roomId}/upload-image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setSuccess(true);
      setTimeout(() => router.push("/rooms"), 1400);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to save room.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('addRoom')}</h1>
          <p className="page-subtitle">{t('addRoomSubtitle', 'Register a new room in the hotel')}</p>
        </div>
        <Link href="/rooms" className="btn btn-secondary">
          <ArrowLeft size={14} /> Back to Rooms
        </Link>
      </div>

      <div className="form-card">
        <div className="form-header">
          <div className="avatar-sm"><BedDouble size={14} /></div>
          <div className="form-header-text">
            <p className="form-heading">Room Information</p>
            <p className="form-subheading">All fields except description and image are required</p>
          </div>
        </div>

        {success && (
          <div className="feedback-success">
            <CheckCircle size={15} /> Room added successfully! Redirecting…
          </div>
        )}
        {error && (
          <div className="feedback-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="r-num">Room Number *</label>
              <input id="r-num" className="form-input" type="number" placeholder="e.g. 101"
                value={roomNumber} onChange={e => setRoomNumber(e.target.value)} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="r-floor">Floor</label>
              <input id="r-floor" className="form-input" type="text" placeholder="e.g. 1, 2, Ground"
                value={floor} onChange={e => setFloor(e.target.value)} />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="r-hotel">Hotel *</label>
              <select id="r-hotel" className="form-select" value={hotelId} onChange={e => setHotelId(e.target.value)} required>
                <option value="">Select hotel…</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="r-type">Room Type *</label>
              <select id="r-type" className="form-select" value={roomTypeId} onChange={handleRoomTypeChange} required>
                <option value="">Select room type…</option>
                {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="r-status">{t('status')}</label>
            <select id="r-status" className="form-select" value={roomStatus} onChange={e => setRoomStatus(e.target.value)}>
              {ROOM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="r-desc">{t('description')}</label>
            <textarea id="r-desc" className="form-textarea" rows={3} placeholder="Optional room description…"
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="r-img">Room Image (optional)</label>
            <input id="r-img" className="form-input" type="file" accept="image/*"
              onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
          </div>

          {previewImg && (
            <div className="form-field">
              <p className="form-label">Room Type Preview</p>
              <img src={previewImg} alt="Room type preview" className="upload-preview-img" loading="lazy" />
            </div>
          )}

          <button type="submit" className="form-button" disabled={loading || success}>
            {loading ? "Saving room…" : "Save Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
