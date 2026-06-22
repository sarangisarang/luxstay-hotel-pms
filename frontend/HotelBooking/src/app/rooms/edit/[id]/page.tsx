"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type UUID = string;

interface RoomDTO {
    id: UUID;
    roomNumber: string;
    floor: string;
    roomTypeId: UUID;
    roomStatus: string;
    description: string;
    imageUrl: string; // may be full URL
}

interface RoomTypeDTO {
    id: UUID;
    name: string;
    imageUrl: string; // filename (stored under uploads/roomtype)
}

/** Base API URL */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080").replace(/\/+$/, "");

/** Build public URL from raw value */
function toPublicImageUrl(raw?: string, kind: "room" | "roomtype" = "room"): string {
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    const file = (raw.split("/").pop() || raw).trim();
    const subdir = kind === "roomtype" ? "roomtype/" : "";
    return `${API_BASE}/uploads/${subdir}${file}`;
}

export default function EditRoomPage() {
  const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [room, setRoom] = useState<RoomDTO | null>(null);
    const [roomTypes, setRoomTypes] = useState<RoomTypeDTO[]>([]);

    const [roomNumber, setRoomNumber] = useState("");
    const [floor, setFloor] = useState("");
    const [roomTypeId, setRoomTypeId] = useState<UUID>("" as UUID);
    const [roomStatus, setRoomStatus] = useState("FREE");
    const [description, setDescription] = useState("");

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrlPublic, setImageUrlPublic] = useState(""); // preview
    const [rtImageUrlPublic, setRtImageUrlPublic] = useState(""); // fallback preview from roomType

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                const [roomRes, rtRes] = await Promise.all([
                    api.get(`/api/rooms/${id}`),
                    api.get(`/api/room-types`),
                ]);

                const r: RoomDTO = roomRes.data;
                const rts: RoomTypeDTO[] = Array.isArray(rtRes.data) ? rtRes.data : rtRes.data?.content ?? [];

                if (cancelled) return;

                setRoom(r);
                setRoomTypes(rts);

                setRoomNumber(String(r.roomNumber ?? ""));
                setFloor(String(r.floor ?? ""));
                setRoomTypeId(r.roomTypeId as UUID);
                setRoomStatus(String(r.roomStatus ?? "FREE"));
                setDescription(String(r.description ?? ""));

                setImageUrlPublic(toPublicImageUrl(r.imageUrl, "room"));
                const rt = rts.find(x => x.id === r.roomTypeId);
                setRtImageUrlPublic(toPublicImageUrl(rt?.imageUrl, "roomtype"));
            } catch (e: any) {
                console.error(e);
                if (!cancelled) setError("Failed to load room.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();

        return () => { cancelled = true; };
    }, [id]);

    async function onUploadImage() {
        if (!imageFile || !room) return;
        const fd = new FormData();
        fd.append("file", imageFile); // RoomController expects "file"
        try {
            const res = await api.post<string>(`/api/rooms/${room.id}/upload-image`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            // backend returns full URL for room images
            const url = typeof res.data === "string" ? res.data : String(res.data);
            setImageUrlPublic(url);
            setRoom({ ...room, imageUrl: url });
        } catch (e) {
            console.error(e);
            alert("Image upload failed.");
        }
    }

    async function onSave(e: React.FormEvent) {
        e.preventDefault();
        if (!room) return;
        setSaving(true);
        setError(null);
        try {
            const payload = {
                id: room.id,
                roomNumber,
                floor,
                roomTypeId,
                roomStatus,
                description,
                imageUrl: room.imageUrl, // leave as is; upload endpoint sets it
            };
            await api.put(`/api/rooms/${room.id}`, payload);
            router.push(`/rooms`);
        } catch (e: any) {
            console.error(e);
            setError(e?.response?.data?.message || "Failed to save room.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-6">⏳ {t('loading')}</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (!room) return <div className="p-6">{t('noData')}</div>;

    const previewSrc = imageFile ? URL.createObjectURL(imageFile) : (imageUrlPublic || rtImageUrlPublic);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">✏️ {t('editRoom')}</h1>

            {/* Preview */}
            <div className="mb-4">
                {previewSrc ? (
                    <img src={previewSrc} alt="Room image" className="w-full h-64 object-cover rounded-lg" />
                ) : (
                    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500 italic">{t('noImage')}</span>
                    </div>
                )}
            </div>

            <form onSubmit={onSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1">
                        <span className="font-semibold">{t('roomNumber')}</span>
                        <input className="border rounded px-3 py-2" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} required />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="font-semibold">{t('floor')}</span>
                        <input className="border rounded px-3 py-2" value={floor} onChange={e => setFloor(e.target.value)} />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="font-semibold">{t('roomType')}</span>
                        <select className="border rounded px-3 py-2" value={roomTypeId} onChange={e => setRoomTypeId(e.target.value as UUID)} required>
                            <option value="" disabled>— {t('filter')} —</option>
                            {roomTypes.map(rt => (
                                <option key={rt.id} value={rt.id}>{rt.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="font-semibold">{t('status')}</span>
                        <select className="border rounded px-3 py-2" value={roomStatus} onChange={e => setRoomStatus(e.target.value)}>
                            <option value="FREE">{t('freeStatus', 'FREE')}</option>
                            <option value="RESERVED">{t('reservedStatus2', 'RESERVED')}</option>
                            <option value="OCCUPIED">{t('occupiedStatus2', 'OCCUPIED')}</option>
                            <option value="MAINTENANCE">{t('maintenanceStatus2', 'MAINTENANCE')}</option>
                        </select>
                    </label>
                </div>

                <label className="flex flex-col gap-1">
                    <span className="font-semibold">{t('description')}</span>
                    <textarea className="border rounded px-3 py-2 min-h-24" value={description} onChange={e => setDescription(e.target.value)} />
                </label>

                <div className="flex items-center gap-3">
                    <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
                    <button type="button" onClick={onUploadImage} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50" disabled={!imageFile}>
                        {t('uploadImage')}
                    </button>
                </div>

                <div className="flex gap-3">
                    <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50" disabled={saving}>
                        {saving ? t('saving') : t('saveRoom')}
                    </button>
                    <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => router.back()}>
                        {t('cancel')}
                    </button>
                </div>
            </form>
        </div>
    );
}
