"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { LayoutGrid, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

const FEATURE_LABELS: Record<string, string> = {
  airConditioning:             "❄️ Air Conditioning",
  internet:                    "🌐 Internet",
  toilet:                      "🚽 Toilet",
  bed:                         "🛏️ Bed",
  tv:                          "📺 TV",
  balcony:                     "🌅 Balcony",
  minibar:                     "🍷 Minibar",
  heating:                     "🔥 Heating",
  safe:                        "🔐 Safe",
  hairDryer:                   "💇 Hair Dryer",
  roomService:                 "🛎️ Room Service",
  soundproofing:               "🔇 Soundproofing",
  freeWifi:                    "📶 Free WiFi",
  fitnessCentre:               "🏋️ Fitness Centre",
  flatScreenTv:                "🖥️ Flat Screen TV",
  facilitiesForDisabledGuests: "♿ Accessible Facilities",
  nonSmokingRoom:              "🚭 Non-Smoking",
  shower:                      "🚿 Shower",
  towels:                      "🧻 Towels",
  linen:                       "🛌 Linen",
  telephone:                   "📞 Telephone",
  satelliteChannels:           "📡 Satellite TV",
  desk:                        "🪑 Desk",
  wardrobe:                    "🚪 Wardrobe",
  cityView:                    "🏙️ City View",
  electricKettle:              "☕ Electric Kettle",
  clothesRack:                 "🧥 Clothes Rack",
  socketNearBed:               "🔌 Socket Near Bed",
  ironingFacilities:           "🧲 Ironing",
  lift:                        "🛗 Lift",
  carpeted:                    "🧶 Carpeted",
  wakeUpService:               "⏰ Wake-up Service",
  allergyFreeRoom:             "🌿 Allergy-Free",
  laptopSafe:                  "💻 Laptop Safe",
  upperFloorAccessible:        "⬆️ Upper Floor Access",
};

type Features = Record<keyof typeof FEATURE_LABELS, boolean>;

const EMPTY_FEATURES = Object.fromEntries(
  Object.keys(FEATURE_LABELS).map(k => [k, false])
) as Features;

export default function AddRoomType() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [price,       setPrice]       = useState<number>(0);
  const [features,    setFeatures]    = useState<Features>({ ...EMPTY_FEATURES });
  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  function toggleFeature(key: string) {
    setFeatures(p => ({ ...p, [key]: !p[key as keyof Features] }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await api.post("/api/room-types", {
        name: name.trim(),
        description: description.trim(),
        pricePerNight: price,
        ...features,
      });
      const roomTypeId: string = res.data?.id;
      if (!roomTypeId) throw new Error("Room type ID missing in response.");
      if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        await api.post(`/api/room-types/${roomTypeId}/upload-image`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setSuccess(true);
      setTimeout(() => router.push("/room-types"), 1400);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to create room type.");
    } finally {
      setLoading(false);
    }
  }

  const activeCount = Object.values(features).filter(Boolean).length;

  return (
    <div className="fade-in form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('addRoomType', 'Add Room Type')}</h1>
          <p className="page-subtitle">{t('addRoomTypeSubtitle', 'Define a new room category with amenities')}</p>
        </div>
        <Link href="/room-types" className="btn btn-secondary">
          <ArrowLeft size={14} /> Back to Room Types
        </Link>
      </div>

      <div className="form-card">
        <div className="form-header">
          <div className="avatar-sm"><LayoutGrid size={14} /></div>
          <div className="form-header-text">
            <p className="form-heading">Room Type Details</p>
            <p className="form-subheading">Name and price are required</p>
          </div>
        </div>

        {success && (
          <div className="feedback-success">
            <CheckCircle size={15} /> Room type created! Redirecting…
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
              <label className="form-label" htmlFor="rt-name">Type Name *</label>
              <input id="rt-name" className="form-input" type="text" placeholder="e.g., Deluxe Suite"
                value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="rt-price">Price Per Night (USD) *</label>
              <input id="rt-price" className="form-input" type="number" step="0.01" min="0"
                placeholder="0.00" value={price} onChange={e => setPrice(Number(e.target.value))} required />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="rt-desc">{t('description')}</label>
            <textarea id="rt-desc" className="form-textarea" rows={3} placeholder="Describe this room type…"
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="form-field">
            <div className="form-label">Amenities <span className="form-hint">({activeCount} selected)</span></div>
            <div className="feature-checkbox-grid">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <label key={key} className={`feature-checkbox${features[key as keyof Features] ? " feature-checkbox-on" : ""}`}>
                  <input type="checkbox" className="feature-checkbox-input"
                    checked={features[key as keyof Features]}
                    onChange={() => toggleFeature(key)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="rt-img">Room Type Image</label>
            <div className="upload-zone">
              <label className="upload-label" htmlFor="rt-img">
                Choose image…
              </label>
              <input id="rt-img" type="file" accept="image/*" className="upload-input"
                onChange={handleImageChange} />
              {imagePreview && (
                <div className="upload-preview">
                  <img src={imagePreview} alt="Preview" className="upload-preview-img" />
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="form-button" disabled={loading || success}>
            {loading ? "Creating…" : "Create Room Type"}
          </button>
        </form>
      </div>
    </div>
  );
}
