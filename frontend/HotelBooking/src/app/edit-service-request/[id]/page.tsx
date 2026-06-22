"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type ServiceRequest = {
    id: string;
    guestId: string;
    serviceId: string;
    status: string;
    requestDate: string; // ISO
    description?: string;
};

type Guest = { id: string; firstName: string; lastName: string };
type Service = { id: string; name: string };

// helper: ISO → yyyy-MM-ddTHH:mm (input[type=datetime-local])
function toLocalDateTimeInputValue(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function EditServiceRequestPage() {
  const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [request, setRequest] = useState<ServiceRequest | null>(null);
    const [guests, setGuests] = useState<Guest[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string>("");

    // სტატუსის ვარიანტები — თუ request-ში სხვაა, ავტომატურად დაემატება
    const baseStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    const statusOptions = useMemo(() => {
        const cur = request?.status?.trim();
        return cur && !baseStatuses.includes(cur) ? [cur, ...baseStatuses] : baseStatuses;
    }, [request?.status]);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError("");
            try {
                const [reqRes, guestsRes, servicesRes] = await Promise.all([
                    api.get(`/api/servicerequests/${id}`),
                    api.get(`/api/guests`),
                    api.get(`/api/services`),
                ]);

                const reqData: ServiceRequest = reqRes.data;
                const guestsData: Guest[] = Array.isArray(guestsRes.data)
                    ? guestsRes.data
                    : guestsRes.data?.content ?? [];
                const servicesData: Service[] = Array.isArray(servicesRes.data)
                    ? servicesRes.data
                    : servicesRes.data?.content ?? [];

                if (!cancelled) {
                    setRequest(reqData);
                    setGuests(guestsData);
                    setServices(servicesData);
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.response?.data?.message || e?.message || "Load failed");
                console.error("Error loading data:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        if (!request) return;
        const { name, value } = e.target;
        setRequest({ ...request, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!request) return;
        setSaving(true);
        setError("");

        try {
            await api.put(`/api/servicerequests/${id}`, request);
            router.push("/service-requests");
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || "Update failed");
            console.error("Update failed:", e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="p-4">{t('loading')}</p>;
    if (!request) return <p className="p-4 text-red-600">Service request not found.</p>;

    return (
        <div className="mx-auto max-w-2xl p-4">
            <h1 className="mb-4 text-2xl font-semibold">🛠️ Edit Service Request</h1>

            {error && <p className="mb-3 rounded bg-red-50 p-2 text-red-700">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border p-4 bg-white">
                {/* Guest */}
                <label className="block">
                    <span className="mb-1 block font-medium">👤 Guest</span>
                    <select
                        name="guestId"
                        value={request.guestId}
                        onChange={handleChange}
                        className="w-full rounded border p-2"
                        required
                    >
                        <option value="">{t('selectGuest', 'Select guest')}</option>
                        {guests.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.firstName} {g.lastName}
                            </option>
                        ))}
                    </select>
                </label>

                {/* Service */}
                <label className="block">
                    <span className="mb-1 block font-medium">🧰 Service</span>
                    <select
                        name="serviceId"
                        value={request.serviceId}
                        onChange={handleChange}
                        className="w-full rounded border p-2"
                        required
                    >
                        <option value="">{t('selectService', 'Select service')}</option>
                        {services.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </label>

                {/* Status */}
                <label className="block">
                    <span className="mb-1 block font-medium">🏷️ Status</span>
                    <select
                        name="status"
                        value={request.status}
                        onChange={handleChange}
                        className="w-full rounded border p-2"
                        required
                    >
                        {statusOptions.map((st) => (
                            <option key={st} value={st}>
                                {st}
                            </option>
                        ))}
                    </select>
                </label>

                {/* Request date */}
                <label className="block">
                    <span className="mb-1 block font-medium">📅 Request Date</span>
                    <input
                        type="datetime-local"
                        name="requestDate"
                        value={toLocalDateTimeInputValue(request.requestDate)}
                        onChange={handleChange}
                        className="w-full rounded border p-2"
                        required
                    />
                </label>

                {/* Description */}
                <label className="block">
                    <span className="mb-1 block font-medium">📝 Description</span>
                    <textarea
                        name="description"
                        value={request.description || ""}
                        onChange={handleChange}
                        className="w-full rounded border p-2"
                        rows={4}
                        placeholder="Add details…"
                    />
                </label>

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
                    >
                        {saving ? t('savingDots') : t('saveChanges2')}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push("/service-requests")}
                        className="rounded border px-4 py-2"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
