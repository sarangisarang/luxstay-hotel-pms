"use client";

function getApiBase(): string {
    // აუცილებლად მოითხოვე NEXT_PUBLIC_API_BASE; თუ არაა, fallback = 8080
    const envBase = process.env.NEXT_PUBLIC_API_BASE;
    return (envBase && /^https?:\/\//i.test(envBase))
        ? envBase.replace(/\/+$/, "")
        : "http://localhost:8080";
}

function buildRoomTypeImageUrl(raw?: string): string {
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw; // სრული URL
    const base = getApiBase();
    const cleaned = String(raw).replace(/^\/+/, "");
    if (cleaned.startsWith("uploads/")) return `${base}/${cleaned}`;
    if (cleaned.startsWith("roomtype/")) return `${base}/uploads/${cleaned}`;
    const file = cleaned.split("/").pop() || cleaned;
    return `${base}/uploads/roomtype/${encodeURIComponent(file)}`;
}

export default function RoomTypeImage({
                                          imageName,
                                          alt,
                                          className,
                                      }: {
    imageName?: string | null;
    alt?: string;
    className?: string;
}) {
    if (!imageName) return <span className="text-gray-400 italic">No Image</span>;
    const src = buildRoomTypeImageUrl(imageName);
    console.debug("[RoomTypeImage] src:", src, "raw:", imageName, "API_BASE:", getApiBase());
    return (
        <img
            src={src}
            alt={alt || "Room type image"}
            className={className}
            loading="lazy"
            onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.onerror = null;
                el.src =
                    "data:image/svg+xml;utf8," +
                    encodeURIComponent(
                        `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
               <rect width='100%' height='100%' fill='#eee'/>
               <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#888' font-size='20'>No Image</text>
             </svg>`
                    );
            }}
        />
    );
}
