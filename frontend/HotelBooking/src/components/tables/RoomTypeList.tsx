"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import RoomTypeImage from "@/components/tables/RoomTypeImage";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import AiInsightCard from "@/components/AiInsightCard";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface RoomType {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  imageUrl: string;
  airConditioning: boolean;
  internet: boolean;
  toilet: boolean;
  bed: boolean;
  tv: boolean;
  balcony: boolean;
  minibar: boolean;
  heating: boolean;
  safe: boolean;
  hairDryer: boolean;
  roomService: boolean;
  soundproofing: boolean;
  freeWifi: boolean;
  fitnessCentre: boolean;
  flatScreenTv: boolean;
  facilitiesForDisabledGuests: boolean;
  nonSmokingRoom: boolean;
  shower: boolean;
  towels: boolean;
  linen: boolean;
  telephone: boolean;
  satelliteChannels: boolean;
  desk: boolean;
  wardrobe: boolean;
  cityView: boolean;
  electricKettle: boolean;
  clothesRack: boolean;
  socketNearBed: boolean;
  ironingFacilities: boolean;
  lift: boolean;
  carpeted: boolean;
  wakeUpService: boolean;
  allergyFreeRoom: boolean;
  laptopSafe: boolean;
  upperFloorAccessible: boolean;
}

const FEATURES: { key: keyof RoomType; labelKey: string; icon: string }[] = [
  { key: "airConditioning",             labelKey: "featAirConditioning",   icon: "❄️" },
  { key: "internet",                    labelKey: "featInternet",          icon: "🌐" },
  { key: "toilet",                      labelKey: "featToilet",            icon: "🚽" },
  { key: "bed",                         labelKey: "featBed",               icon: "🛏️" },
  { key: "tv",                          labelKey: "featTv",                icon: "📺" },
  { key: "balcony",                     labelKey: "featBalcony",           icon: "🌅" },
  { key: "minibar",                     labelKey: "featMinibar",           icon: "🍷" },
  { key: "heating",                     labelKey: "featHeating",           icon: "🔥" },
  { key: "safe",                        labelKey: "featSafe",              icon: "🔐" },
  { key: "hairDryer",                   labelKey: "featHairDryer",         icon: "💇" },
  { key: "roomService",                 labelKey: "featRoomService",       icon: "🛎️" },
  { key: "soundproofing",               labelKey: "featSoundproofing",     icon: "🔇" },
  { key: "freeWifi",                    labelKey: "featFreeWifi",          icon: "📶" },
  { key: "fitnessCentre",               labelKey: "featFitnessCentre",     icon: "🏋️" },
  { key: "flatScreenTv",                labelKey: "featFlatScreenTv",      icon: "🖥️" },
  { key: "facilitiesForDisabledGuests", labelKey: "featAccessible",        icon: "♿" },
  { key: "nonSmokingRoom",              labelKey: "featNonSmoking",        icon: "🚭" },
  { key: "shower",                      labelKey: "featShower",            icon: "🚿" },
  { key: "towels",                      labelKey: "featTowels",            icon: "🧺" },
  { key: "linen",                       labelKey: "featLinen",             icon: "🛌" },
  { key: "telephone",                   labelKey: "featTelephone",         icon: "📞" },
  { key: "satelliteChannels",           labelKey: "featSatelliteTv",       icon: "📡" },
  { key: "desk",                        labelKey: "featDesk",              icon: "🪑" },
  { key: "wardrobe",                    labelKey: "featWardrobe",          icon: "🚪" },
  { key: "cityView",                    labelKey: "featCityView",          icon: "🏙️" },
  { key: "electricKettle",              labelKey: "featElectricKettle",    icon: "☕" },
  { key: "clothesRack",                 labelKey: "featClothesRack",       icon: "🧥" },
  { key: "socketNearBed",               labelKey: "featSocketNearBed",     icon: "🔌" },
  { key: "ironingFacilities",           labelKey: "featIroning",           icon: "🧲" },
  { key: "lift",                        labelKey: "featLift",              icon: "🛗" },
  { key: "carpeted",                    labelKey: "featCarpeted",          icon: "🧶" },
  { key: "wakeUpService",               labelKey: "featWakeUpService",     icon: "⏰" },
  { key: "allergyFreeRoom",             labelKey: "featAllergyFree",       icon: "🌿" },
  { key: "laptopSafe",                  labelKey: "featLaptopSafe",        icon: "💻" },
  { key: "upperFloorAccessible",        labelKey: "featUpperFloorAccess",  icon: "⬆️" },
];

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function FeaturePills({ rt }: { rt: RoomType }) {
  const { t } = useTranslation();
  const active = FEATURES.filter(f => rt[f.key]);
  const inactive = FEATURES.filter(f => !rt[f.key]);
  return (
    <div className="feature-list">
      {active.map(f => (
        <span key={f.key} className="feature-pill feature-pill-on" title={t(f.labelKey)}>{f.icon} {t(f.labelKey)}</span>
      ))}
      {inactive.map(f => (
        <span key={f.key} className="feature-pill feature-pill-off" title={t(f.labelKey)}>{f.icon} {t(f.labelKey)}</span>
      ))}
    </div>
  );
}

export default function RoomTypeList() {
  const { t } = useTranslation();
  const router = useRouter();
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
    api.get("/api/room-types")
      .then(r => { if (alive) setRoomTypes(Array.isArray(r.data) ? r.data : (r.data?.content ?? [])); })
      .catch(e => { if (alive) setError(e?.message ?? "Failed to load room types."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roomTypes;
    return roomTypes.filter(rt => [rt.name, rt.description].some(v => (v ?? "").toLowerCase().includes(q)));
  }, [roomTypes, search]);

  async function handleDelete(id: string) {
    if (!confirm(t('deleteRoomTypeConfirm'))) return;
    setDeleting(id);
    try {
      await api.delete(`/api/room-types/${id}`);
      setRoomTypes(prev => prev.filter(rt => rt.id !== id));
    } catch { alert("Failed to delete room type."); }
    finally { setDeleting(null); }
  }

  if (loading) return (
    <div className="state-container">
      <div className="spinner" />
      <p className="state-title">{t('loadingRoomTypes')}</p>
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
      <AiInsightCard endpoint="/api/ai/insights/revenue" title={t('aiRoomTypePricingInsights')} compact />
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('roomTypes')}</h1>
          <p className="page-subtitle">{roomTypes.length} {t('types')}</p>
        </div>
        <div className="page-actions">
          {isAdmin && (
            <Link href="/add-room-type" className="btn btn-primary">
              <Plus size={15} /> {t('addRoomType')}
            </Link>
          )}
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{t('allRoomTypes')}</span>
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input className="search-input" placeholder={t('searchRoomTypes')}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="state-container">
            <div className="state-icon">🛏️</div>
            <p className="state-title">{search ? t('noRoomTypesMatch') : t('noRoomTypesYet')}</p>
          </div>
        ) : (
          <div className="room-type-grid">
            {filtered.map(rt => {
              const imageName = (rt.imageUrl || "").split("/").pop() || "";
              return (
                <div key={rt.id} className="rt-card">
                  <div className="rt-card-img">
                    <RoomTypeImage imageName={imageName} alt={rt.name} className="rt-img" />
                  </div>
                  <div className="rt-card-body">
                    <div className="rt-card-header-row">
                      <div>
                        <h3 className="rt-name">{rt.name}</h3>
                        <p className="rt-price">{fmtMoney(rt.pricePerNight)} {t('perNight')}</p>
                      </div>
                      <div className="cell-actions">
                        <button type="button" className="btn btn-secondary btn-sm"
                          onClick={() => router.push(`/room-types/edit/${rt.id}`)} title={t('editRoom')}>
                          <Pencil size={13} />
                        </button>
                        <button type="button" className="btn btn-danger btn-sm"
                          disabled={deleting === rt.id}
                          onClick={() => handleDelete(rt.id)} title={t('deleteRoom')}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {rt.description && (
                      <p className="rt-desc">{rt.description.length > 120 ? rt.description.slice(0, 120) + "…" : rt.description}</p>
                    )}
                    <FeaturePills rt={rt} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
