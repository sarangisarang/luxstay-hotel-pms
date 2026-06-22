import Link from "next/link";
import CopyButton from "./CopyButton";
import AiInsightCard from "@/components/AiInsightCard";

const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080").replace(/\/+$/, "");

/* ========= Normalizers ========= */
function normalizeGuest(raw: any) {
    if (!raw) return null;
    const id = raw.id ?? raw.guestId ?? raw.uuid ?? raw._id ?? raw.pk ?? null;
    const firstName =
        raw.firstName ?? raw.first_name ?? raw.firstname ?? raw.name?.first ?? raw.givenName ?? null;
    const lastName =
        raw.lastName ?? raw.last_name ?? raw.lastname ?? raw.name?.last ?? raw.familyName ?? null;
    const email =
        raw.email ?? raw.emailAddress ?? raw.email_address ?? raw.mail ?? raw.contactEmail ?? null;
    const phone =
        raw.phone ?? raw.phoneNumber ?? raw.phone_number ?? raw.mobile ?? raw.contactPhone ?? null;
    const address = raw.address ?? raw.addressLine ?? raw.address1 ?? raw.street ?? null;
    const birthDate = raw.birthDate ?? raw.birth_date ?? raw.dob ?? raw.dateOfBirth ?? null;
    const name = raw.name ?? raw.fullName ?? raw.full_name ?? null;
    return { id, firstName, lastName, email, phone, address, birthDate, name };
}

async function safeJson<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

/* ========= Small UI helpers ========= */
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

const fmtDate = (iso?: string | null) =>
    iso
        ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "2-digit", day: "2-digit" }).format(
            new Date(iso)
        )
        : "—";

const fmtMoney = (n?: number | null, currency = "EUR") =>
    n == null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

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
        <td className={cx("px-4 py-3 align-middle text-gray-800", right && "text-right", mono && "font-mono", className)}>
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
    return <span className={cx("inline-flex items-center gap-2 rounded-full px-3 py-1", map[color])}>{children}</span>;
}
function Icon({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <span role="img" aria-label={label} className="inline-grid place-items-center text-[18px] leading-none">
      {children}
    </span>
    );
}
function DetailItem({ label, value, icon }: { label: string; value: React.ReactNode; icon?: string }) {
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

/* ========= Page ========= */
export default async function GuestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let guest: ReturnType<typeof normalizeGuest> | null = null;
    let bookings: any[] = [];
    const debug: Record<string, any> = {};

    // 1) Try /api/guests/:id
    try {
        const res = await fetch(`${BASE}/api/guests/${encodeURIComponent(id)}`, { cache: "no-store" });
        const raw = await safeJson<any>(res);
        const candidates: any[] = [raw, raw?.guest, raw?.data, raw?.data?.guest, raw?.content, Array.isArray(raw) ? raw[0] : undefined].filter(Boolean);
        for (const c of candidates) {
            const n = normalizeGuest(c);
            if (n?.id || n?.firstName || n?.lastName || n?.name) {
                guest = n;
                debug.primaryCandidate = c;
                break;
            }
        }
        if (!guest) debug.primaryRaw = raw;
    } catch (e) {
        debug.primaryError = String(e);
    }

    // 2) Bookings by guest
    try {
        const bRes = await fetch(`${BASE}/api/bookings?guestId=${encodeURIComponent(id)}`, { cache: "no-store" });
        const bRaw = await safeJson<any>(bRes);
        bookings = Array.isArray(bRaw) ? bRaw : bRaw?.content ?? [];
        bookings.sort((a, b) => +new Date(b.checkInDate) - +new Date(a.checkInDate));
    } catch (e) {
        debug.bookingsError = String(e);
    }

    // 3) Fallback via list
    if (!guest) {
        try {
            const listRes = await fetch(`${BASE}/api/guests`, { cache: "no-store" });
            const listRaw = await safeJson<any>(listRes);
            const arr: any[] = Array.isArray(listRaw) ? listRaw : listRaw?.content ?? [];
            const found = arr.find((g: any) => {
                const gid = g?.id ?? g?.guestId ?? g?._id ?? g?.uuid ?? g?.pk;
                return gid && String(gid).toLowerCase() === id.toLowerCase();
            });
            guest = normalizeGuest(found);
            debug.fallbackListSample = arr?.[0];
            debug.fallbackFound = found;
        } catch (e) {
            debug.fallbackError = String(e);
        }
    }

    // 4) Name from a booking if empty
    if (bookings.length && guest) {
        const gn = bookings[0]?.guestName as string | undefined;
        if (gn && !guest.firstName && !guest.lastName && !guest.name) {
            const parts = gn.split(/\s+/);
            guest.firstName = parts[0] ?? null;
            guest.lastName = parts.slice(1).join(" ") || null;
            debug.derivedFromBooking = gn;
        }
    }

    if (!guest) {
        return (
            <div className="mx-auto max-w-3xl p-6 space-y-4">
                <h1 className="text-2xl font-semibold">Guest not found</h1>
                <p className="text-gray-600">We couldn’t load this guest’s details. Please try again or go back to the guest list.</p>
                <Link href="/guests" className="text-blue-600 underline">← Back to Guests</Link>
            </div>
        );
    }

    const fullName = guest.name || `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim() || "—";

    return (
        <div className="mx-auto max-w-6xl p-6 space-y-8">
            <AiInsightCard
                endpoint={`/api/ai/insights/guest/${guest.id}`}
                title={`AI Guest Profile — ${fullName}`}
                compact
            />
            {/* HEADER */}
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-lg">
                <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-xl" />

                <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="grid h-16 w-16 place-items-center rounded-full bg-white/20 text-[32px] leading-none shadow-inner">
                            👤
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{fullName}</h1>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
                  <span role="img" aria-label="id">🆔</span>
                  <code className="font-mono">{guest.id ?? id}</code>
                </span>
                                {/* Client-only action */}
                                <CopyButton text={String(guest.id ?? id)} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <a
                            href={`/api/guests/${guest.id}/data-export`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium shadow hover:bg-white/30 transition"
                            title="GDPR data export for this guest"
                        >
                            ⬇ GDPR Export
                        </a>
                        <Link
                            href="/guests"
                            className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium shadow hover:bg-white/30 transition"
                        >
                            ← Back to Guests
                        </Link>
                    </div>
                </div>
            </header>

            {/* DETAILS */}
            <section className="rounded-3xl bg-white/90 backdrop-blur shadow ring-1 ring-gray-100">
                <div className="border-b px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-600 tracking-wide">Guest Details</h2>
                </div>

                <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                    <DetailItem label="Name" icon="🧑" value={fullName} />
                    <DetailItem
                        label="Email"
                        icon="✉️"
                        value={
                            guest.email ? (
                                <a href={`mailto:${guest.email}`} className="no-underline">
                                    <Pill color="emerald">
                                        <span>●</span>
                                        {guest.email}
                                    </Pill>
                                </a>
                            ) : (
                                "—"
                            )
                        }
                    />
                    <DetailItem
                        label="Phone"
                        icon="📱"
                        value={
                            guest.phone ? (
                                <a href={`tel:${guest.phone}`} className="no-underline">
                                    <Pill color="sky">
                                        <span>●</span>
                                        {guest.phone}
                                    </Pill>
                                </a>
                            ) : (
                                "—"
                            )
                        }
                    />
                    <DetailItem label="Address" icon="🏠" value={guest.address ?? "—"} />
                    <DetailItem label="Birth Date" icon="🎂" value={fmtDate(guest.birthDate)} />
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
                    <p className="p-6 text-gray-500">No bookings for this guest.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                            <tr className="bg-gray-50">
                                <Th>Booking</Th>
                                <Th>Room</Th>
                                <Th>Check-In</Th>
                                <Th>Check-Out</Th>
                                <Th className="text-right">Total</Th>
                            </tr>
                            </thead>
                            <tbody className="divide-y">
                            {bookings.map((b) => (
                                <tr key={b.id} className="transition hover:bg-indigo-50/50">
                                    <Td mono>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-indigo-500" aria-hidden>#</span>
                          {b.id}
                      </span>
                                    </Td>
                                    <Td>
                      <span className="inline-flex items-center gap-2">
                        <Icon label="room">🛏️</Icon>
                        <span className="font-medium">{b.roomNumber ?? "—"}</span>
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
                          {fmtMoney(typeof b.totalAmount === "number" ? b.totalAmount : undefined, (b as any).currency || "EUR")}
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
