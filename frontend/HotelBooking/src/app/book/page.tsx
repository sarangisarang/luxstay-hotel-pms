"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, Users, ArrowRight, Hotel } from "lucide-react";
import bs from "@/styles/BookPublic.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Room = {
  id: string;
  roomNumber: number;
  floor: string;
  description: string;
  imageUrl: string;
  hotel: string;
  hotelId: string;
  hotelAddress: string;
  hotelCity: string;
  hotelCountry: string;
  hotelLatitude: number | null;
  hotelLongitude: number | null;
  typeName: string;
  pricePerNight: number;
  capacity: number;
};

function today() { return new Date().toISOString().split("T")[0]; }
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
}

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

export default function BookPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [checkIn,  setCheckIn]  = useState(today());
  const [checkOut, setCheckOut] = useState(addDays(today(), 1));
  const [guests,   setGuests]   = useState(1);
  const [rooms,    setRooms]    = useState<Room[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [sortBy,     setSortBy]     = useState<"price_asc"|"price_desc">("price_asc");

  const [selectedHotel,   setSelectedHotel]   = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCity,    setSelectedCity]    = useState("");

  const [allCountries,    setAllCountries]    = useState<string[]>([]);
  const [citiesByCountry, setCitiesByCountry] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch(`${API}/api/public/bookings/locations`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setAllCountries(d.countries ?? []);
          setCitiesByCountry(d.cities ?? {});
        }
      })
      .catch(() => {});
  }, []);

  const uniqueHotels = useMemo(() =>
    [...new Map(rooms.map(r => [r.hotelId, r.hotel])).values()].filter(Boolean).sort(),
    [rooms]);

  const availableCities = useMemo(() =>
    selectedCountry ? (citiesByCountry[selectedCountry] ?? []) : [],
    [citiesByCountry, selectedCountry]);

  const hasLocationData = allCountries.length > 0;

  const nights = useMemo(() => {
    const diff = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000;
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  async function search() {
    if (!checkIn || !checkOut || nights <= 0) { setError("Check-out must be after check-in."); return; }
    setError(null); setLoading(true); setSearched(true);
    try {
      const res = await fetch(`${API}/api/public/bookings/available-rooms?checkIn=${checkIn}&checkOut=${checkOut}`);
      if (!res.ok) throw new Error("Failed to load rooms");
      setRooms(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load rooms");
    } finally { setLoading(false); }
  }

  const types = useMemo(() => [...new Set(rooms.map(r => r.typeName).filter(Boolean))], [rooms]);

  const displayed = useMemo(() => {
    let list = rooms;
    if (selectedHotel)   list = list.filter(r => r.hotel        === selectedHotel);
    if (selectedCountry) list = list.filter(r => r.hotelCountry === selectedCountry);
    if (selectedCity)    list = list.filter(r => r.hotelCity    === selectedCity);
    if (filterType)      list = list.filter(r => r.typeName     === filterType);
    return [...list].sort((a, b) =>
      sortBy === "price_asc" ? a.pricePerNight - b.pricePerNight : b.pricePerNight - a.pricePerNight
    );
  }, [rooms, selectedHotel, selectedCountry, selectedCity, filterType, sortBy]);

  function book(room: Room) {
    const params = new URLSearchParams({
      roomId: room.id, checkIn, checkOut,
      nights: String(nights), hotel: room.hotel, room: String(room.roomNumber),
      type: room.typeName, price: String(room.pricePerNight),
      total: String(Math.round(room.pricePerNight * nights * 100) / 100),
      imageUrl: room.imageUrl,
    });
    router.push(`/book/checkout?${params.toString()}`);
  }

  return (
    <div>
      {/* Hero */}
      <div className={bs.hero}>
        <div className={bs.heroGlow} />
        <div className={bs.heroIcon}><Hotel size={40} color="rgba(255,255,255,.85)" /></div>
        <h1 className={bs.heroTitle}>Find Your Perfect Room</h1>
        <p className={bs.heroSub}>Search availability and book instantly — no account needed</p>

        {/* Search card */}
        <div className={bs.searchCard}>
          {/* Location row */}
          <div className={bs.locationRow}>
            <div className={bs.locationField}>
              <label className={bs.fieldLabel}>🏨 Hotel</label>
              <select value={selectedHotel} onChange={e => setSelectedHotel(e.target.value)}
                className={bs.locationSelect} title="Select hotel">
                <option value="">{t('allHotelsOption')}</option>
                {uniqueHotels.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {hasLocationData && (
              <>
                <div className={bs.locationField}>
                  <label className={bs.fieldLabel}>🌍 Country</label>
                  <select value={selectedCountry} onChange={e => { setSelectedCountry(e.target.value); setSelectedCity(""); }}
                    className={bs.locationSelect} title="Select country">
                    <option value="">{t('allCountries')}</option>
                    {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className={bs.locationField}>
                  <label className={bs.fieldLabel}>🏙️ City</label>
                  <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                    className={bs.locationSelect} disabled={!selectedCountry} title="Select city">
                    <option value="">{selectedCountry ? t('allCities') : t('selectCountryFirst')}</option>
                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className={bs.searchDivider} />

          {/* Date + guests + button row */}
          <div className={bs.searchRow}>
            <div className={bs.searchField}>
              <label className={bs.fieldLabel}>
                <Calendar size={13} className={bs.labelIcon} />{t('checkIn')}
              </label>
              <input type="date" value={checkIn} min={today()}
                onChange={e => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1)); }}
                className={bs.dateInput} title="Check-in date" />
            </div>
            <div className={bs.searchField}>
              <label className={bs.fieldLabel}>
                <Calendar size={13} className={bs.labelIcon} />{t('checkOut')}
              </label>
              <input type="date" value={checkOut} min={addDays(checkIn, 1)}
                onChange={e => setCheckOut(e.target.value)}
                className={bs.dateInput} title="Check-out date" />
            </div>
            <div className={bs.searchField}>
              <label className={bs.fieldLabel}>
                <Users size={13} className={bs.labelIcon} />{t('guests')}
              </label>
              <select value={guests} onChange={e => setGuests(Number(e.target.value))}
                className={bs.guestSelect} title="Number of guests">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} guest{n>1?"s":""}</option>)}
              </select>
            </div>
            <button type="button" onClick={search} disabled={loading} className={bs.btnSearch}>
              <Search size={16} />
              {loading ? t('checkingAvailability') : t('search')}
            </button>
          </div>
        </div>

        {error && <p className={bs.heroError}>{error}</p>}
      </div>

      {/* Results */}
      <div className={bs.resultsArea}>
        {searched && !loading && (
          <>
            <div className={bs.filterBar}>
              <span className={bs.filterCount}>
                {displayed.length} room{displayed.length !== 1 ? "s" : ""} available
                {nights > 0 && ` · ${nights} night${nights > 1 ? "s" : ""}`}
              </span>
              <div className={bs.filterControls}>
                {types.length > 1 && (
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className={bs.filterSelect} title="Filter by room type">
                    <option value="">{t('allTypes')}</option>
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                <select value={sortBy} onChange={e => setSortBy(e.target.value as "price_asc"|"price_desc")}
                  className={bs.filterSelect} title="Sort order">
                  <option value="price_asc">{t('priceLowToHigh')}</option>
                  <option value="price_desc">{t('priceHighToLow')}</option>
                </select>
              </div>
            </div>

            {displayed.length === 0 ? (
              <div className={bs.emptyResults}>
                <p className={bs.emptyTitle}>{t('noRoomsAvailable')}</p>
                <p>Try different dates or fewer guests.</p>
              </div>
            ) : (
              <>
                <div className={bs.roomGrid}>
                  {displayed.map(room => (
                    <RoomCard key={room.id} room={room} nights={nights} onBook={() => book(room)} />
                  ))}
                </div>
                <HotelMapsSection rooms={displayed} />
              </>
            )}
          </>
        )}

        {!searched && (
          <div className={bs.emptyInitial}>
            <div><Search size={48} color="#94a3b8" opacity={0.3} /></div>
            <p className={bs.emptyInitialText}>Enter your dates above and click Search</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HotelMapsSection({ rooms }: { rooms: Room[] }) {
  const hotels = useMemo(() => {
    const seen = new Set<string>();
    return rooms.filter(r => { if (seen.has(r.hotelId)) return false; seen.add(r.hotelId); return true; });
  }, [rooms]);

  if (hotels.length === 0) return null;

  return (
    <div className={bs.mapsSection}>
      <h2 className={bs.mapsSectionTitle}>📍 Hotel Location{hotels.length > 1 ? "s" : ""}</h2>
      <div className={bs.mapsGrid}>
        {hotels.map(h => {
          const hasCoords = h.hotelLatitude != null && h.hotelLongitude != null;
          const searchQuery = hasCoords ? `${h.hotelLatitude},${h.hotelLongitude}` : encodeURIComponent(h.hotelAddress || h.hotel);
          const embedUrl = hasCoords
            ? `https://maps.google.com/maps?q=${h.hotelLatitude},${h.hotelLongitude}&output=embed&zoom=15`
            : `https://maps.google.com/maps?q=${searchQuery}&output=embed`;
          const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${searchQuery}`;
          return (
            <div key={h.hotelId} className={bs.hotelMapCard}>
              <div className={bs.hotelMapToolbar}>
                <div>
                  <div className={bs.hotelMapName}>🏨 {h.hotel}</div>
                  {h.hotelAddress && <div className={bs.hotelMapAddress}>{h.hotelAddress}</div>}
                </div>
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={bs.hotelMapDirectionsBtn}>
                  🗺️ Get Directions
                </a>
              </div>
              <iframe src={embedUrl} className={bs.hotelMapIframe} allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade" title={`Map of ${h.hotel}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoomCard({ room, nights, onBook }: { room: Room; nights: number; onBook: () => void }) {
  const { t } = useTranslation();
  const total = Math.round(room.pricePerNight * nights * 100) / 100;
  const imgSrc = room.imageUrl
    ? (room.imageUrl.startsWith("http") ? room.imageUrl : `${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080"}/${room.imageUrl}`)
    : null;

  const directionsUrl = room.hotelLatitude != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${room.hotelLatitude},${room.hotelLongitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(room.hotelAddress || room.hotel)}`;

  return (
    <div className={bs.roomCard}>
      <div className={imgSrc ? bs.roomImgBox : bs.roomImgFallback}>
        {imgSrc ? (
          <img src={imgSrc} alt={`Room ${room.roomNumber}`} className={bs.roomImg} />
        ) : (
          <div className={bs.roomImgEmpty}>
            <Hotel size={40} />
            <span className={bs.roomImgEmptyLabel}>{t('noPhoto')}</span>
          </div>
        )}
        {room.typeName && <span className={bs.roomTypeBadge}>{room.typeName}</span>}
      </div>

      <div className={bs.roomBody}>
        <div className={bs.roomBodyHead}>
          <div>
            <p className={bs.roomName}>{t('room')} {room.roomNumber}</p>
            {room.hotel && <p className={bs.roomHotel}>{room.hotel}</p>}
            {room.hotel && (
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={bs.directionsChip}>
                📍 {t('getDirections')}
              </a>
            )}
          </div>
          <div className={bs.priceWrap}>
            <p className={bs.priceMain}>
              €{room.pricePerNight}<span className={bs.priceNight}>{t('perNight')}</span>
            </p>
          </div>
        </div>

        {room.description && <p className={bs.roomDesc}>{room.description}</p>}

        <div className={bs.roomPills}>
          {room.floor && <span className={bs.roomPill}>{t('floor')} {room.floor}</span>}
          <span className={bs.roomPill}><Users size={11} /> {room.capacity} {t('guests')}</span>
        </div>

        {nights > 0 && (
          <div className={bs.roomTotalBox}>
            <span className={bs.roomTotalLabel}>{nights} {t('nights')} {t('total')}</span>
            <span className={bs.roomTotalValue}>€{total.toFixed(2)}</span>
          </div>
        )}

        <button type="button" onClick={onBook} className={bs.btnBookNow}>
          {t('bookLabel')} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
