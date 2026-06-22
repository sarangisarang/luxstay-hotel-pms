"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { ArrowLeft } from "lucide-react";

type Payment = {
    id: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    status: string;
    bookingId: string;
};
type Booking = {
    id: string;
    guestId: string;
    checkInDate?: string;
    checkOutDate?: string;
    roomNumber?: number;
};
type Guest = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
};

function formatDate(d?: string) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
    const base = "inline-block px-3 py-1 rounded-full text-xs font-semibold";
    switch (status.toUpperCase()) {
        case "PAID":      return <span className={`${base} bg-green-100 text-green-800`}>✅ PAID</span>;
        case "PENDING":   return <span className={`${base} bg-yellow-100 text-yellow-700`}>⏳ PENDING</span>;
        case "FAILED":    return <span className={`${base} bg-red-100 text-red-700`}>❌ FAILED</span>;
        default:          return <span className={`${base} bg-gray-100 text-gray-600`}>❔ {status}</span>;
    }
}

function DetailCard({ title, titleColor, children }: { title: string; titleColor?: string; children: React.ReactNode }) {
    return (
        <section className="bg-white shadow-xl rounded-2xl border border-gray-200 p-6 mb-8">
            <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${titleColor ?? ""}`}>{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">{children}</div>
        </section>
    );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <span className="font-medium">{label}:</span>{" "}
            <span className="ml-1">{value}</span>
        </div>
    );
}

export default function PaymentDetails({ id }: { id: string }) {
    const router = useRouter();
    const [payment, setPayment] = useState<Payment | null>(null);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [guest,   setGuest]   = useState<Guest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const { data: p } = await api.get<Payment>(`/api/payments/${id}`);
                setPayment(p);
                const { data: b } = await api.get<Booking>(`/api/bookings/${p.bookingId}`);
                setBooking(b);
                try {
                    const { data: g } = await api.get<Guest>(`/api/guests/${b.guestId}`);
                    setGuest(g);
                } catch { /* guest optional */ }
            } catch {
                setError("Payment not found.");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id]);

    if (loading) return <div className="p-10 text-gray-500">Loading…</div>;
    if (error || !payment || !booking) {
        return (
            <div className="max-w-xl mx-auto px-6 py-16 text-center">
                <p className="text-lg text-red-600 mb-4">{error ?? "Payment not found."}</p>
                <Link href="/payments" className="btn btn-secondary"><ArrowLeft size={14} /> Back to Payments</Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-10">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-extrabold text-gray-800">🧾 Payment Details</h1>
                <button type="button" onClick={() => router.back()} className="btn btn-secondary">
                    <ArrowLeft size={14} /> Back
                </button>
            </div>

            <DetailCard title="💳 Payment Information" titleColor="text-indigo-700">
                <DetailRow label="Payment ID" value={payment.id} />
                <DetailRow label="Status"     value={<StatusBadge status={payment.status} />} />
                <DetailRow label="Amount"     value={`${Number(payment.amount).toFixed(2)} €`} />
                <DetailRow label="Method"     value={payment.paymentMethod} />
                <DetailRow label="Date"       value={formatDate(payment.paymentDate)} />
            </DetailCard>

            {guest && (
                <DetailCard title="🧍 Guest Information" titleColor="text-green-700">
                    <DetailRow label="Full Name" value={`${guest.firstName} ${guest.lastName}`} />
                    <DetailRow label="Email"     value={guest.email} />
                    <DetailRow label="Phone"     value={guest.phone} />
                    <DetailRow label="Address"   value={guest.address || "—"} />
                </DetailCard>
            )}

            <DetailCard title="🏨 Booking Information" titleColor="text-blue-700">
                <DetailRow label="Booking ID"  value={booking.id} />
                <DetailRow label="Room Number" value={booking.roomNumber ?? "—"} />
                <DetailRow label="Check-In"    value={formatDate(booking.checkInDate)} />
                <DetailRow label="Check-Out"   value={formatDate(booking.checkOutDate)} />
            </DetailCard>
        </div>
    );
}
