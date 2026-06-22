"use client";

const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080").replace(/\/+$/, "");
const FALLBACK_SRC = "/images/placeholder.jpg";

type Props = {
    imageName?: string | null;
    alt?: string;
    className?: string;
};

export default function HotelImage({ imageName, alt, className }: Props) {
    if (!imageName) {
        return <img src={FALLBACK_SRC} alt="No image" className={className} />;
    }

    const src = imageName.startsWith("http") ? imageName : `${BASE}/uploads/${imageName}`;

    return (
        <img
            src={src}
            alt={alt ?? "Hotel image"}
            className={className}
            onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_SRC; }}
        />
    );
}
