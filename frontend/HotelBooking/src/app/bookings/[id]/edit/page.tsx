"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Guest = { id: string; name: string };
type Room = { id: string; roomNumber: string; pricePerNight?: number; roomType?: { pricePerNight?: number } };
type Service = { id: string; name: string; price: number };

type Booking = {
    id: string;
    guestId: string;
    roomId: string;
    serviceIds: string[];
    guestName?: string;
    roomNumber?: string;
    checkInDate: string;
    checkOutDate: string;
    bookingStatus: string;
    paymentStatus: string;
    totalAmount?: number;
    totalServiceAmount?: number;
};

export default function BookingEditPage() {
  const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const bookingId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [formData, setFormData] = useState<Booking | null>(null);
    const [error, setError] = useState<string | null>(null);

    // fetch data
    useEffect(() => {
        async function fetchData() {
            try {
                const [bookingRes, guestsRes, roomsRes, servicesRes] = await Promise.all([
                    api.get(`/api/bookings/${bookingId}`),
                    api.get("/api/guests"),
                    api.get("/api/rooms"),
                    api.get("/api/services"),
                ]);
                setFormData(bookingRes.data);
                setGuests(guestsRes.data.content || guestsRes.data);
                setRooms(roomsRes.data.content || roomsRes.data);
                setServices(servicesRes.data.content || servicesRes.data);
            } catch (e: any) {
                setError("Failed to load data.");
            } finally {
                setLoading(false);
            }
        }
        if (bookingId) fetchData();
    }, [bookingId]);

    // handle input change
    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        if (!formData) return;
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    function handleServiceToggle(serviceId: string) {
        if (!formData) return;
        const selected = new Set(formData.serviceIds);
        if (selected.has(serviceId)) {
            selected.delete(serviceId);
        } else {
            selected.add(serviceId);
        }
        setFormData({ ...formData, serviceIds: Array.from(selected) });
    }

    // calculate prices
    function calculateSummary() {
        if (!formData) return { nights: 0, roomTotal: 0, servicesTotal: 0, grandTotal: 0 };

        const checkIn = new Date(formData.checkInDate);
        const checkOut = new Date(formData.checkOutDate);
        const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

        const room = rooms.find((r) => r.id === formData.roomId);
        const pricePerNight = room?.pricePerNight || room?.roomType?.pricePerNight || 0;
        const roomTotal = nights * pricePerNight;

        const servicesTotal = formData.serviceIds
            .map((sid) => services.find((s) => s.id === sid)?.price || 0)
            .reduce((a, b) => a + b, 0);

        return { nights, roomTotal, servicesTotal, grandTotal: roomTotal + servicesTotal };
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData) return;
        try {
            await api.put(`/api/bookings/${bookingId}`, formData);
            router.push("/bookings");
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to update booking.");
        }
    }

    if (loading) return <p className="p-4">Loading booking...</p>;
    if (error) return <p className="p-4 text-red-600">{error}</p>;
    if (!formData) return <p className="p-4">Booking not found.</p>;

    const summary = calculateSummary();

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Edit Booking</h1>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white shadow-md rounded-lg p-6">

                {/* Guest */}
                <div>
                    <label className="block mb-1">Guest</label>
                    <select
                        name="guestId"
                        value={formData.guestId}
                        onChange={handleChange}
                        className="w-full border rounded p-2"
                    >
                        {guests.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Room */}
                <div>
                    <label className="block mb-1">Room</label>
                    <select
                        name="roomId"
                        value={formData.roomId}
                        onChange={handleChange}
                        className="w-full border rounded p-2"
                    >
                        {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                                Room {r.roomNumber}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Services */}
                <div>
                    <label className="block mb-1">{t('services')}</label>
                    <div className="grid grid-cols-2 gap-2">
                        {services.map((s) => (
                            <label key={s.id} className="flex items-center space-x-2 border rounded p-2">
                                <input
                                    type="checkbox"
                                    checked={formData.serviceIds.includes(s.id)}
                                    onChange={() => handleServiceToggle(s.id)}
                                />
                                <span>
                  {s.name} (${s.price})
                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-1">Check-in Date</label>
                        <input
                            type="date"
                            name="checkInDate"
                            value={formData.checkInDate}
                            onChange={handleChange}
                            className="w-full border rounded p-2"
                        />
                    </div>
                    <div>
                        <label className="block mb-1">Check-out Date</label>
                        <input
                            type="date"
                            name="checkOutDate"
                            value={formData.checkOutDate}
                            onChange={handleChange}
                            className="w-full border rounded p-2"
                        />
                    </div>
                </div>

                {/* Status */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-1">Booking Status</label>
                        <select
                            name="bookingStatus"
                            value={formData.bookingStatus}
                            onChange={handleChange}
                            className="w-full border rounded p-2"
                        >
                            <option value="PENDING">{t('pending')}</option>
                            <option value="CONFIRMED">{t('confirmed')}</option>
                            <option value="CANCELLED">{t('cancelled')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1">Payment Status</label>
                        <select
                            name="paymentStatus"
                            value={formData.paymentStatus}
                            onChange={handleChange}
                            className="w-full border rounded p-2"
                        >
                            <option value="UNPAID">{t('unpaid')}</option>
                            <option value="PAID">{t('paid')}</option>
                            <option value="REFUNDED">{t('refunded', 'Refunded')}</option>
                        </select>
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h2 className="font-semibold mb-2">Summary</h2>
                    <p>Nights: {summary.nights}</p>
                    <p>Room Total: ${summary.roomTotal.toFixed(2)}</p>
                    <p>Services Total: ${summary.servicesTotal.toFixed(2)}</p>
                    <p className="font-bold">{t('grandTotal', 'Grand Total')}: ${summary.grandTotal.toFixed(2)}</p>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
