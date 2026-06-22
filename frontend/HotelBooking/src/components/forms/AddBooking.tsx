'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import styles from "@/styles/BookingAdd.module.css";
import AiInsightCard from "@/components/AiInsightCard";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

/* ===== Types ===== */
type Money = number | string;
interface Guest { id: string; firstName: string; lastName: string; email?: string; }
interface RoomType { id?: string; name: string; pricePerNight: Money; imageUrl?: string; }
interface HotelData {
    id: string;
    name: string;
    imageName?: string;
    rating?: number;
    city?: string;
    country?: string;
    address?: string;
    phone?: string;
    email?: string;
    description?: string;
}
interface Room {
    id: string;
    roomNumber: number | string;
    roomTypeId?: string;
    price?: Money;          // room-level override price (from API field "price")
    pricePerNight?: Money;  // alias some backends use
    roomType?: RoomType;
    imageUrl?: string;
    hotelName?: string;
    hotelId?: string;
    floor?: string;
    description?: string;
}
interface Service { id: string; name: string; price: Money; }

const toNumber = (v: Money | undefined | null): number => {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (typeof v === 'string') { const n = Number(v); return isNaN(n) || !isFinite(n) ? 0 : n; }
    return 0;
};
const fmt = (n: number, cur = 'EUR') =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(isFinite(n) ? n : 0);

/* ===== Component ===== */
export default function BookingForm() {
  const { t } = useTranslation();
    const [guests,   setGuests]   = useState<Guest[]>([]);
    const [rooms,    setRooms]    = useState<Room[]>([]);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [hotels,   setHotels]   = useState<HotelData[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        guestId: '',
        roomId: '',
        checkInDate: '',
        checkOutDate: '',
        bookingStatus: 'CONFIRMED',
        bookingSource: 'DIRECT_PHONE',
        specialRequests: '',
    });

    const [hotelFilter, setHotelFilter] = useState('');

    const [loadingInit, setLoadingInit] = useState(true);
    const [submitting,  setSubmitting]  = useState(false);
    const [error,  setError]  = useState('');
    const [okMsg,  setOkMsg]  = useState('');
    const searchParams = useSearchParams();

    const [availability,    setAvailability]    = useState<string | null>(null);
    const [checkingAvail,   setCheckingAvail]   = useState(false);

    // Pre-fill from query params
    useEffect(() => {
        const rid = searchParams.get("roomId");
        const ci  = searchParams.get("checkInDate");
        const co  = searchParams.get("checkOutDate");
        if (rid) setFormData(p => ({ ...p, roomId: rid }));
        if (ci)  setFormData(p => ({ ...p, checkInDate: ci }));
        if (co)  setFormData(p => ({ ...p, checkOutDate: co }));
    }, [searchParams]);

    // Fetch initial data
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoadingInit(true);
                const [gRes, rRes, sRes, rtRes, hRes] = await Promise.all([
                    api.get('/api/guests'),
                    api.get('/api/rooms'),
                    api.get('/api/services'),
                    api.get('/api/room-types'),
                    api.get('/api/hotels'),
                ]);
                const arr = <T,>(d: unknown): T[] => Array.isArray(d) ? d as T[] : (d as {content?: T[]})?.content ?? [];
                if (!cancelled) {
                    setGuests(arr<Guest>(gRes.data));
                    setRooms(arr<Room>(rRes.data));
                    setServices(arr<Service>(sRes.data));
                    setRoomTypes(arr<RoomType>(rtRes.data));
                    setHotels(arr<HotelData>(hRes.data));
                }
            } catch (e) {
                if (!cancelled) setError('Failed to load data. Please check the backend is running.');
                console.error(e);
            } finally {
                if (!cancelled) setLoadingInit(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Derived selections
    const selectedGuest = useMemo(() => guests.find(g => g.id === formData.guestId), [guests, formData.guestId]);
    const selectedRoom  = useMemo(() => rooms.find(r => r.id === formData.roomId), [rooms, formData.roomId]);
    const selectedServiceObjs = useMemo(() => services.filter(s => selectedServices.includes(s.id)), [services, selectedServices]);

    const findPrice = (room?: Room): number => {
        if (!room) return 0;
        // Check room-level price first, then room type price
        if (room.price != null && toNumber(room.price) > 0) return toNumber(room.price);
        if (room.pricePerNight != null && toNumber(room.pricePerNight) > 0) return toNumber(room.pricePerNight);
        if (room.roomType?.pricePerNight != null) return toNumber(room.roomType.pricePerNight);
        if (room.roomTypeId) {
            const rt = roomTypes.find(t => t.id === room.roomTypeId);
            if (rt?.pricePerNight != null) return toNumber(rt.pricePerNight);
        }
        return 0;
    };

    const roomImage = useMemo(() => {
        const r = selectedRoom;
        if (!r) return null;
        return r.imageUrl || r.roomType?.imageUrl || roomTypes.find(t => t.id === r.roomTypeId)?.imageUrl || null;
    }, [selectedRoom, roomTypes]);

    const nights = useMemo(() => {
        if (!formData.checkInDate || !formData.checkOutDate) return 0;
        const diff = Math.round((new Date(formData.checkOutDate).getTime() - new Date(formData.checkInDate).getTime()) / 86400000);
        return Math.max(diff, 0);
    }, [formData.checkInDate, formData.checkOutDate]);

    const pricePerNight = useMemo(() => findPrice(selectedRoom), [selectedRoom, roomTypes]);
    const servicesTotal = useMemo(() => selectedServiceObjs.reduce((s, x) => s + toNumber(x.price), 0), [selectedServiceObjs]);
    const roomTotal     = useMemo(() => nights * pricePerNight, [nights, pricePerNight]);
    const grandTotal    = useMemo(() => roomTotal + servicesTotal, [roomTotal, servicesTotal]);

    const todayISO = new Date().toISOString().split('T')[0];
    const checkOutMin = formData.checkInDate
        ? new Date(new Date(formData.checkInDate).getTime() + 86400000).toISOString().split('T')[0]
        : todayISO;

    const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
    const selectedHotelData = useMemo(
        () => hotels.find(h => h.name === hotelFilter) ?? null,
        [hotels, hotelFilter]
    );
    const hotelImageSrc = useMemo(() => {
        const img = selectedHotelData?.imageName;
        if (!img) return null;
        return img.startsWith('http') ? img : `${BASE}/uploads/${img}`;
    }, [selectedHotelData, BASE]);

    // Unique hotels from rooms list
    const hotelOptions = useMemo(() => {
        const map = new Map<string, string>();
        rooms.forEach(r => { if (r.hotelName) map.set(r.hotelName, r.hotelName); });
        return [...map.keys()].sort();
    }, [rooms]);

    // Rooms filtered by hotel
    const filteredRooms = useMemo(() =>
        hotelFilter ? rooms.filter(r => r.hotelName === hotelFilter) : rooms,
        [rooms, hotelFilter]);

    // Availability check
    useEffect(() => {
        const { roomId, checkInDate, checkOutDate } = formData;
        if (!roomId || !checkInDate || !checkOutDate) { setAvailability(null); return; }
        let cancelled = false;
        (async () => {
            setCheckingAvail(true);
            try {
                const res = await api.get('/api/bookings/check-availability', { params: { roomId, checkInDate, checkOutDate } });
                const ok = typeof res.data === 'boolean' ? res.data : res.data?.available ?? false;
                if (!cancelled) setAvailability(ok ? 'available' : 'unavailable');
            } catch { if (!cancelled) setAvailability(null); }
            if (!cancelled) setCheckingAvail(false);
        })();
        return () => { cancelled = true; };
    }, [formData.roomId, formData.checkInDate, formData.checkOutDate]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setOkMsg(''); setError('');
        setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    };
    const onServiceToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const id = e.target.value;
        setSelectedServices(p => e.target.checked ? [...p, id] : p.filter(s => s !== id));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true); setOkMsg(''); setError('');
        if (!formData.guestId || !formData.roomId || !formData.checkInDate || !formData.checkOutDate) {
            setError('Please fill all required fields.'); setSubmitting(false); return;
        }
        if (nights <= 0) { setError('Check-out must be after check-in (min. 1 night).'); setSubmitting(false); return; }
        if (availability === 'unavailable') { setError('Room is not available for these dates.'); setSubmitting(false); return; }
        try {
            await api.post('/api/bookings', {
                guestId:         formData.guestId,
                roomId:          formData.roomId,
                checkInDate:     formData.checkInDate,
                checkOutDate:    formData.checkOutDate,
                bookingStatus:   formData.bookingStatus || 'CONFIRMED',
                bookingSource:   formData.bookingSource || 'DIRECT_PHONE',
                specialRequests: formData.specialRequests || undefined,
                serviceIds:      selectedServices,
            });
            setOkMsg(`✅ ${t('bookingCreatedSuccess')}`);
            setFormData({ guestId: '', roomId: '', checkInDate: '', checkOutDate: '', bookingStatus: 'CONFIRMED', bookingSource: 'DIRECT_PHONE', specialRequests: '' });
            setSelectedServices([]);
            setHotelFilter('');
            setAvailability(null);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setError(e?.response?.data?.message ?? e?.message ?? 'Unknown error');
        } finally { setSubmitting(false); }
    };

    const roomTypeName = (r?: Room) =>
        r?.roomType?.name ?? roomTypes.find(t => t.id === r?.roomTypeId)?.name ?? '';

    return (
        <form onSubmit={onSubmit}
              className={`mx-auto grid max-w-5xl grid-cols-1 gap-6 p-4 lg:grid-cols-3 ${styles.root} ${styles.formGrid}`}>

            {/* AI Insight */}
            <div className="lg:col-span-3">
                <AiInsightCard
                    endpoint="/api/ai/insights/room-suggest"
                    params={formData.checkInDate && formData.checkOutDate ? {
                        checkIn: formData.checkInDate, checkOut: formData.checkOutDate, guests: "1",
                    } : undefined}
                    title={t('aiRoomRecommendation')}
                    autoLoad={false}
                    compact
                />
            </div>

            {/* LEFT: form */}
            <div className={`lg:col-span-2 space-y-4 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm ${styles.card}`}>
                <h2 className={styles.h2}>📝 {t('createBooking')}</h2>

                {loadingInit && <p className={`rounded p-2 ${styles.alert} ${styles.alertInfo}`}>Loading data…</p>}
                {error  && <p className={`rounded p-2 ${styles.alert} ${styles.alertError}`}>{error}</p>}
                {okMsg  && <p className={`rounded p-2 ${styles.alert} ${styles.alertInfo}`}>{okMsg}</p>}

                {/* Guest */}
                <label className={styles.field}>
                    <span className={styles.label}>👤 {t('guest')}</span>
                    <select name="guestId" value={formData.guestId} onChange={onChange} required className={styles.select}>
                        <option value="">{t('selectGuest')}</option>
                        {guests.map(g => (
                            <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                        ))}
                    </select>
                </label>

                {/* Hotel filter + Room */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={styles.field}>
                        <span className={styles.label}>🏨 {t('filterByHotel')}</span>
                        <select value={hotelFilter}
                            onChange={e => { setHotelFilter(e.target.value); setFormData(p => ({ ...p, roomId: '' })); }}
                            className={styles.select}>
                            <option value="">{t('allHotelsOption')}</option>
                            {hotelOptions.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </label>
                    <label className={styles.field}>
                        <span className={styles.label}>🛏️ {t('room')} *</span>
                        <select name="roomId" value={formData.roomId} onChange={onChange} required className={styles.select}>
                            <option value="">{t('selectRoom')}</option>
                            {filteredRooms.map(r => {
                                const type = roomTypeName(r);
                                const price = findPrice(r);
                                return (
                                    <option key={r.id} value={r.id}>
                                        {r.hotelName ? `[${r.hotelName}] ` : ''}Room {r.roomNumber}
                                        {type ? ` — ${type}` : ''}
                                        {price ? ` (${fmt(price)}/night)` : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </label>
                </div>

                {/* Selected room details */}
                {selectedRoom && (
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm">
                        <span className="font-semibold text-indigo-800">
                            {selectedRoom.hotelName} · Room {selectedRoom.roomNumber}
                            {selectedRoom.floor ? ` · Floor ${selectedRoom.floor}` : ''}
                        </span>
                        {selectedRoom.description && (
                            <p className="mt-0.5 text-indigo-600 text-xs">{selectedRoom.description}</p>
                        )}
                    </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className={styles.field}>
                        <span className={styles.label}>📅 {t('checkIn')}</span>
                        <input type="date" name="checkInDate" min={todayISO} value={formData.checkInDate}
                            onChange={onChange}
                            className={`${styles.input} ${formData.checkInDate ? styles.dateStrong : ''}`} required />
                    </label>
                    <label className={styles.field}>
                        <span className={styles.label}>📆 {t('checkOut')}</span>
                        <input type="date" name="checkOutDate" min={checkOutMin} value={formData.checkOutDate}
                            onChange={onChange}
                            className={`${styles.input} ${formData.checkOutDate ? styles.dateStrong : ''}`} required />
                    </label>
                </div>

                {/* Availability badge */}
                <div className="text-sm h-5">
                    {checkingAvail && <span className="text-gray-500">{t('checkingAvailability')}</span>}
                    {!checkingAvail && availability === 'available'   && <span className="font-semibold text-emerald-600">✅ {t('roomAvailable')}</span>}
                    {!checkingAvail && availability === 'unavailable' && <span className="font-semibold text-red-600">❌ {t('roomNotAvailable')}</span>}
                </div>

                {/* Services */}
                <fieldset className="rounded-lg border border-gray-200 p-3">
                    <legend className="px-1 font-semibold text-gray-700">🧰 {t('addOnServices')}</legend>
                    {services.length === 0
                        ? <p className="text-sm text-gray-400">{t('noServicesConfigured')}</p>
                        : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {services.map(s => (
                                    <label key={s.id} className={styles.serviceItem}>
                                        <span className="flex items-center gap-2">
                                            <input type="checkbox" value={s.id}
                                                checked={selectedServices.includes(s.id)}
                                                onChange={onServiceToggle} />
                                            <span className="text-sm">{s.name}</span>
                                        </span>
                                        <span className="text-sm text-gray-500">{fmt(toNumber(s.price))}</span>
                                    </label>
                                ))}
                            </div>
                        )
                    }
                </fieldset>

                {/* Status */}
                <label className={styles.field}>
                    <span className={styles.label}>🏷️ {t('bookingStatus')}</span>
                    <select name="bookingStatus" value={formData.bookingStatus} onChange={onChange} className={styles.select} required>
                        <option value="CONFIRMED">{t('confirmed')}</option>
                        <option value="PENDING">{t('pending')}</option>
                        <option value="CANCELLED">{t('cancelled')}</option>
                    </select>
                </label>

                <label className={styles.formGroup}>
                    <span className={styles.label}>📡 {t('bookingSource')}</span>
                    <select name="bookingSource" value={formData.bookingSource} onChange={onChange} className={styles.select}>
                        <option value="DIRECT_WEBSITE">{t('directWebsite')}</option>
                        <option value="DIRECT_PHONE">{t('phone')}</option>
                        <option value="WALK_IN">{t('walkIn')}</option>
                        <option value="OTA_BOOKING_COM">{t('bookingCom', 'Booking.com')}</option>
                        <option value="OTA_EXPEDIA">{t('expedia', 'Expedia')}</option>
                        <option value="OTA_AIRBNB">{t('airbnb', 'Airbnb')}</option>
                        <option value="OTA_OTHER">{t('otherOta')}</option>
                        <option value="CORPORATE">{t('corporate', 'Corporate')}</option>
                        <option value="TRAVEL_AGENT">{t('travelAgent')}</option>
                        <option value="CHANNEL_MANAGER">{t('channelManager', 'Channel Manager')}</option>
                        <option value="GDS">{t('gds', 'GDS')}</option>
                        <option value="GROUP">{t('group', 'Group')}</option>
                        <option value="LOYALTY_PROGRAM">{t('loyaltyProgram', 'Loyalty Program')}</option>
                    </select>
                </label>

                <label className={styles.formGroup}>
                    <span className={styles.label}>📝 {t('specialRequests')}</span>
                    <textarea name="specialRequests" value={formData.specialRequests} onChange={onChange}
                        className={styles.select} rows={2} placeholder="Guest requests, notes for arrival…"
                        style={{ resize: "vertical", minHeight: 60 }} />
                </label>

                <button type="submit"
                    disabled={submitting || loadingInit || availability === 'unavailable'}
                    className={styles.primaryBtn}>
                    {submitting ? t('creatingBooking') : t('createBooking')}
                </button>
            </div>

            {/* RIGHT: preview */}
            <aside className={`${styles.card} space-y-4 p-4`}>
                <h2 className={styles.h2}>🏨 {t('roomPreview')}</h2>

                {/* Hotel banner — shown when hotel filter is active */}
                {hotelFilter && selectedHotelData && (
                    <div className="rounded-xl overflow-hidden border border-indigo-100 shadow-sm">
                        <div className="relative h-36 bg-gradient-to-br from-indigo-100 to-purple-100">
                            {hotelImageSrc ? (
                                <img src={hotelImageSrc} alt={selectedHotelData.name}
                                     className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                                <div className="flex h-full items-center justify-center text-indigo-300 text-3xl">🏨</div>
                            )}
                            {selectedHotelData.rating != null && (
                                <span className="absolute top-2 right-2 rounded-full bg-amber-400/90 px-2 py-0.5 text-xs font-bold text-white">
                                    ★ {selectedHotelData.rating}
                                </span>
                            )}
                        </div>
                        <div className="bg-white px-3 py-2">
                            <div className="font-bold text-gray-900 text-sm">{selectedHotelData.name}</div>
                            {(selectedHotelData.city || selectedHotelData.country) && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                    📍 {[selectedHotelData.city, selectedHotelData.country].filter(Boolean).join(', ')}
                                </div>
                            )}
                            {selectedHotelData.address && (
                                <div className="text-xs text-gray-400 mt-0.5 truncate">{selectedHotelData.address}</div>
                            )}
                        </div>
                    </div>
                )}

                <div className={styles.imageCard}>
                    <div className="aspect-[4/3] w-full bg-gray-100 overflow-hidden">
                        {roomImage ? (
                            <img src={roomImage} alt={`Room ${selectedRoom?.roomNumber ?? ''}`}
                                 className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
                                {selectedRoom ? t('noImage') : t('selectARoom')}
                            </div>
                        )}
                    </div>
                    <div className="p-3 text-sm text-gray-700">
                        <div className="font-semibold">
                            {selectedRoom ? `${t('room')} ${selectedRoom.roomNumber}` : t('noRoomSelected')}
                        </div>
                        <div className="text-gray-500 text-xs">{selectedRoom?.hotelName ?? '—'}</div>
                        <div className="text-gray-400 text-xs">{roomTypeName(selectedRoom) || '—'}</div>
                    </div>
                </div>

                <h2 className={styles.h2}>📊 {t('bookingSummary')}</h2>
                <div className={`${styles.card} p-3 space-y-1`}>
                    <div className={styles.summaryRow}>
                        <span>👤 {t('guest')}</span>
                        <span>{selectedGuest ? `${selectedGuest.firstName} ${selectedGuest.lastName}` : '—'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>🏨 {t('hotel')}</span>
                        <span>{selectedRoom?.hotelName ?? '—'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>🛏️ {t('room')}</span>
                        <span>{selectedRoom ? `${selectedRoom.roomNumber} · ${roomTypeName(selectedRoom)}` : '—'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>📅 {t('nights')}</span>
                        <span>{nights > 0 ? nights : '—'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>💵 {t('ratePerNight')}</span>
                        <span className={styles.totalStrong}>{pricePerNight > 0 ? fmt(pricePerNight) : '—'}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>🏠 {t('roomTotal')}</span>
                        <span className={styles.totalStrong}>{roomTotal > 0 ? fmt(roomTotal) : '—'}</span>
                    </div>
                </div>

                {selectedServiceObjs.length > 0 && (
                    <div className={`${styles.card} p-3`}>
                        <div className="mb-1 text-sm font-semibold">🧰 {t('services')}</div>
                        <ul className="space-y-1">
                            {selectedServiceObjs.map(s => (
                                <li key={s.id} className="flex justify-between text-xs">
                                    <span>{s.name}</span>
                                    <span className={styles.totalStrong}>{fmt(toNumber(s.price))}</span>
                                </li>
                            ))}
                        </ul>
                        <hr className={styles.hr} />
                        <div className={`${styles.summaryRow} text-sm`}>
                            <span>{t('servicesTotal')}</span>
                            <span className={styles.totalStrong}>{fmt(servicesTotal)}</span>
                        </div>
                    </div>
                )}

                <div className={`${styles.summaryAccent} p-3`}>
                    <div className="flex justify-between text-base font-bold">
                        <span>💶 {t('grandTotal')}</span>
                        <span className={styles.totalStrong}>{grandTotal > 0 ? fmt(grandTotal) : '—'}</span>
                    </div>
                    <p className="mt-1 text-xs text-indigo-600 opacity-75">
                        {t('pendingPaymentNote')}
                    </p>
                </div>
            </aside>
        </form>
    );
}
