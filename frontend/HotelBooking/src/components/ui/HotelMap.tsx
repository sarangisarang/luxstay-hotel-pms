"use client";

import styles from "@/styles/HotelMap.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface HotelMapProps {
    name: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
}

export default function HotelMap({ name, address, latitude, longitude }: HotelMapProps) {
    const { t } = useTranslation();
    const hasCoords = latitude != null && longitude != null;

    const embedUrl = hasCoords
        ? `https://maps.google.com/maps?q=${latitude},${longitude}&output=embed&zoom=15`
        : address
        ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
        : null;

    const directionsUrl = hasCoords
        ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
        : address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
        : null;

    const mapsUrl = hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        : address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        : null;

    if (!embedUrl) {
        return (
            <div className={`${styles.wrapper} ${styles.noData}`}>
                No location data available for this hotel.
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.toolbar}>
                <div>
                    <div className={styles.hotelName}>📍 {name}</div>
                    {address && <div className={styles.hotelAddress}>{address}</div>}
                </div>
                <div className={styles.actions}>
                    {mapsUrl && (
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.btnView}>
                            View on Map
                        </a>
                    )}
                    {directionsUrl && (
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={styles.btnDirections}>
                            🗺️ Get Directions
                        </a>
                    )}
                </div>
            </div>
            <iframe
                src={embedUrl}
                className={styles.map}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Map of ${name}`}
            />
        </div>
    );
}
