// src/app/rooms/[id]/page.tsx
import Link from "next/link";
import Image from "next/image";
import CopyButton from "@/app/guests/[id]/CopyButton";

// ---- Base URL for server-side fetch ----
const BASE =
    (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080").replace(/\/+$/, "");

/* ========= Normalizers ========= */
function normalizeRoomType(raw: any) {
    if (!raw) return null;
    return {
        id: raw.id ?? raw.roomTypeId ?? raw.uuid ?? raw._id ?? null,
        name:
            raw.name ??
            raw.type ??
            raw.roomTypeName ??
            raw.room_type_name ??
            "Unknown",
        imageUrl:
            raw.imageUrl ??
            raw.roomTypeImageUrl ??
            raw.image ??
            raw.photo ??
            null,
        pricePerNight:
            typeof raw.pricePerNight === "number"
                ? raw.pricePerNight
                : typeof raw.price === "number"
                    ? raw.price
                    : typeof raw.room_type_price === "number"
                        ? raw.room_type_price
                        : null,
    };
}

async function fetchRoomType(roomTypeId: string): Promise<any | null> {
    // სცადე რამდენიმე გზა (თუ ბექენდი სხვა ალტერნატიულ გზებს იყენებს)
    const candidates = [
        `${BASE}/api/room-types/${encodeURIComponent(roomTypeId)}`,
        `${BASE}/api/roomtype/${encodeURIComponent(roomTypeId)}`,
        `${BASE}/api/types/${encodeURIComponent(roomTypeId)}`,
    ];
    for (const url of candidates) {
        try {
            const res = await fetch(url, { cache: "no-store" });
            if (res.ok) {
                const json = await res.json();
                return json;
            }
        } catch {
            // try next
        }
    }
    return null;
}

function normalizeRoom(raw: any, rt?: any) {
    if (!raw) return null;
    return {
        id: raw.id ?? raw.uuid ?? raw._id ?? null,
        roomNumber: raw.roomNumber ?? raw.number ?? raw.name ?? "—",
        roomStatus: raw.roomStatus ?? raw.status ?? "FREE",
        imageUrl: raw.imageUrl || null,
        price: typeof raw.price === "number" ? raw.price : null,
        floor: raw.floor ?? null,
        description: raw.description ?? null,
        roomTypeId: raw.roomTypeId ?? null,
        roomType: rt ? normalizeRoomType(rt) : null,
    } as {
        id: string | null;
        roomNumber: string | number;
        roomStatus: string;
        imageUrl: string | null;
        price: number | null;
        floor: number | null;
        description: string | null;
        roomTypeId: string | null;
        roomType: ReturnType<typeof normalizeRoomType> | null;
    };
}

function normalizeBooking(raw: any) {
    return {
        id: raw.id ?? raw.bookingId ?? raw.uuid ?? raw._id ?? "",
        roomNumber: raw.roomNumber ?? raw.room_no ?? "",
        guestName: raw.guestName ?? raw.guest_name ?? "",
        checkInDate: raw.checkInDate ?? raw.check_in ?? raw.from ?? null,
        checkOutDate: raw.checkOutDate ?? raw.check_out ?? raw.to ?? null,
        bookingStatus: raw.bookingStatus ?? raw.status ?? "PENDING",
        totalAmount:
            typeof raw.totalAmount === "number"
                ? raw.totalAmount
                : typeof raw.total_price === "number"
                    ? raw.total_price
                    : null,
        services: Array.isArray(raw.services) ? raw.services : [],
        totalServiceAmount:
            typeof raw.totalServiceAmount === "number"
                ? raw.totalServiceAmount
                : typeof raw.TotalServiceAmount === "number"
                    ? raw.TotalServiceAmount
                    : null,
    };
}

/* ========= Utils ========= */
async function safeJson<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

const cx = (...c: Array<string | false | null | undefined>) =>
    c.filter(Boolean).join(" ");

const fmtDate = (iso?: string | null) =>
    iso
        ? new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date(iso))
        : "—";

const fmtMoney = (n?: number | null, currency = "EUR") =>
    n == null
        ? "—"
        : new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
            n
        );

/* ========= Image helpers ========= */
// აბსოლუტური ბმული თუა — 그대로 დაბრუნდება; თუ არა — ააგებს URL-ს შენი backend-ისთვის
function resolveImageUrl(raw?: string | null): string | null {
    if (!raw) return null;
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

    const fname = (raw.split("/").pop() || raw).trim();

    // აპროვირებულ პათებზე სცადე
    const paths = [
        `/api/roomtype/${encodeURIComponent(fname)}`,
        `/api/room-types/${encodeURIComponent(fname)}`,
        `/api/uploads/roomtype/${encodeURIComponent(fname)}`,
        `/api/files/${encodeURIComponent(fname)}`,
    ];

    return `${BASE}${paths[0]}`;
}

function safeImage(src?: string | null, fallback = "/placeholder.jpg") {
    return src && src.trim() ? src : fallback;
}

/* ========= Small UI helpers ========= */
function Th({
                children,
                className,
                muted = true,
            }: {
    children: React.ReactNode;
    className?: string;
    muted?: boolean;
}) {
    return (
        <th
            className={cx(
                "px-4 py-3 text-left text-[11px] uppercase tracking-wide",
                muted ? "text-gray-500" : "text-gray-700",
                className
            )}
        >
            {children}
        </th>
    );
}
function Td({
                children,
                right,
                mono,
                className,
            }: {
    children: React.ReactNode;
    right?: boolean;
    mono?: boolean;
    className?: string;
}) {
    return (
        <td
            className={cx(
                "px-4 py-3 align-middle text-gray-800",
                right && "text-right",
                mono && "font-mono",
                className
            )}
        >
            {children}
        </td>
    );
}
function Pill({
                  children,
                  color = "emerald",
              }: {
    children: React.ReactNode;
    color?: "emerald" | "sky" | "indigo" | "amber";
}) {
    const map = {
        emerald: "bg-emerald-50 text-emerald-700",
        sky: "bg-sky-50 text-sky-700",
        indigo: "bg-indigo-50 text-indigo-700",
        amber: "bg-amber-50 text-amber-700",
    } as const;
    return (
        <span className={cx("inline-flex items-center gap-2 rounded-full px-3 py-1", map[color])}>
      {children}
    </span>
    );
}
function Icon({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <span role="img" aria-label={label} className="inline-grid place-items-center text-[18px] leading-none">
      {children}
    </span>
    );
}
function DetailItem({
                        label,
                        value,
                        icon,
                    }: {
    label: string;
    value: React.ReactNode;
    icon?: string;
}) {
    return (
        <div className="rounded-xl border border-gray-100 p-4 shadow-sm transition hover:shadow">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                {icon ? <Icon label={label}>{icon}</Icon> : null}
                {label}
            </div>
            <div className="mt-1 text-gray-900">{value}</div>
        </div>
    );
}

/* ========= Data loaders ========= */
async function loadRoom(id: string) {
    // 1) ოთახი
    const rRes = await fetch(`${BASE}/api/rooms/${encodeURIComponent(id)}`, {
        cache: "no-store",
    });
    const rRaw = await safeJson<any>(rRes);

    // 2) roomType, თუ საჭიროა
    let roomType: any = null;
    if (rRaw?.roomTypeId) {
        try {
            // ჯერ პირდაპირ room-types
            const rtDirect = await fetch(
                `${BASE}/api/room-types/${encodeURIComponent(rRaw.roomTypeId)}`,
                { cache: "no-store" }
            );
            if (rtDirect.ok) {
                roomType = await rtDirect.json();
            } else {
                // საცდელი სხვა როუტებიც
                roomType = await fetchRoomType(rRaw.roomTypeId);
            }
        } catch {
            // ignore
        }
    }

    return normalizeRoom(rRaw, roomType);
}

async function loadBookingsByRoom(roomId: string) {
    const res = await fetch(
        `${BASE}/api/bookings?roomId=${encodeURIComponent(roomId)}`,
        { cache: "no-store" }
    );
    const raw = await safeJson<any>(res);
    const arr: any[] = Array.isArray(raw) ? raw : raw?.content ?? [];
    return arr.map(normalizeBooking);
}

/* ========= Page ========= */
export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let room = null as ReturnType<typeof normalizeRoom> | null;
    let bookings: Array<ReturnType<typeof normalizeBooking>> = [];
    const debug: Record<string, any> = {};

    try {
        room = await loadRoom(id);
    } catch (e) {
        debug.roomError = String(e);
    }

    try {
        bookings = await loadBookingsByRoom(id);
    } catch (e) {
        debug.bookingsError = String(e);
    }

    if (!room) {
        return (
            <div className="mx-auto max-w-3xl p-6 space-y-4">
                <h1 className="text-2xl font-semibold">Room not found</h1>
                <p className="text-gray-600">We couldn’t load this room. Please try again or go back to the room list.</p>
                <Link href="/rooms" className="text-blue-600 underline">
                    ← Back to Rooms
                </Link>
            </div>
        );
    }

    const fullPrice = room.price ?? room.roomType?.pricePerNight ?? null;

    const displayImage = safeImage(
        resolveImageUrl(room.imageUrl) ||
        resolveImageUrl(room.roomType?.imageUrl) ||
        "https://images.unsplash.com/photo-1505692794403-34d4982f88aa?q=80&w=1200&auto=format&fit=crop"
    );

    return (
        <div className="mx-auto max-w-6xl p-6 space-y-8">
            {/* HEADER */}
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg">
                <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-xl" />

                <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="grid h-16 w-16 place-items-center rounded-full bg-white/20 text-[32px] leading-none shadow-inner">
                            🛏️
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Room {room.roomNumber}</h1>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
                  <span role="img" aria-label="id">🆔</span>
                  <code className="font-mono">{room.id ?? id}</code>
                </span>
                                <Pill color="indigo">
                                    <span>●</span> Status: {room.roomStatus}
                                </Pill>
                                <CopyButton text={String(room.id ?? id)} />
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/rooms"
                        className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium shadow hover:bg-white/30 transition"
                    >
                        ← Back to Rooms
                    </Link>
                </div>
            </header>

            {/* IMAGE */}
            <div className="overflow-hidden rounded-3xl border bg-white/70 shadow">
                <Image
                    src={displayImage}
                    alt={`Room ${room.roomNumber}`}
                    width={1600}
                    height={900}
                    className="w-full h-auto object-cover"
                    unoptimized
                    priority
                />
            </div>

            {/* DETAILS */}
            <section className="rounded-3xl bg-white/90 backdrop-blur shadow ring-1 ring-gray-100">
                <div className="border-b px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-600 tracking-wide">Room Details</h2>
                </div>

                <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
                    <DetailItem label="Number" icon="🔢" value={room.roomNumber} />
                    <DetailItem label="Status" icon="🏷️" value={<Pill>{room.roomStatus}</Pill>} />
                    <DetailItem label="Floor" icon="🏢" value={room.floor ?? "—"} />
                    <DetailItem label="Price / night" icon="💶" value={fmtMoney(fullPrice ?? null)} />
                    <DetailItem label="Type" icon="🏷️" value={room.roomType?.name ?? "Unknown"} />

                    {/* Room Type thumbnail */}
                    <div className="md:col-span-3">
                        {resolveImageUrl(room.roomType?.imageUrl) ? (
                            <Image
                                src={resolveImageUrl(room.roomType?.imageUrl)!}
                                alt={room.roomType?.name ?? "Room type"}
                                width={300}
                                height={250}
                                className="w-[300px] h-[250px] rounded object-cover border"
                                unoptimized
                            />
                        ) : (
                            <div className="w-[300px] h-[250px] bg-gray-200 flex items-center justify-center rounded border">
                                <span className="text-gray-500 italic">No Image</span>
                            </div>
                        )}
                    </div>

                    <DetailItem label="Description" icon="📝" value={room.description ?? "—"} />
                </div>
            </section>

            {/* BOOKINGS */}
            <section className="rounded-3xl bg-white/90 backdrop-blur shadow ring-1 ring-gray-100">
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-600 tracking-wide">Bookings</h2>
                    <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 text-sm">
            <Icon label="total">📦</Icon> Total: {bookings.length}
          </span>
                </div>

                {bookings.length === 0 ? (
                    <p className="p-6 text-gray-500">No bookings for this room.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                            <tr className="bg-gray-50">
                                <Th>Booking</Th>
                                <Th>Guest</Th>
                                <Th>Check-In</Th>
                                <Th>Check-Out</Th>
                                <Th className="text-right">Total</Th>
                            </tr>
                            </thead>
                            <tbody className="divide-y">
                            {bookings.map((b) => (
                                <tr key={b.id} className="transition hover:bg-emerald-50/50">
                                    <Td mono>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-emerald-500" aria-hidden>#</span>
                          {b.id}
                      </span>
                                    </Td>
                                    <Td>
                      <span className="inline-flex items-center gap-2">
                        <Icon label="guest">👤</Icon>
                        <span className="font-medium">{b.guestName ?? "—"}</span>
                      </span>
                                    </Td>
                                    <Td>
                                        <Icon label="check-in">📅</Icon>
                                        <span className="ml-2">{fmtDate(b.checkInDate)}</span>
                                    </Td>
                                    <Td>
                                        <Icon label="check-out">📆</Icon>
                                        <span className="ml-2">{fmtDate(b.checkOutDate)}</span>
                                    </Td>
                                    <Td right>
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                        <Icon label="money">💶</Icon>
                          {fmtMoney(b.totalAmount ?? null)}
                      </span>
                                    </Td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
