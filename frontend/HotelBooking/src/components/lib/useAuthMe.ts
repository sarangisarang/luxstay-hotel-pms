"use client";
/**
 * @file useAuthMe.ts
 * React hook that fetches the currently authenticated user's profile from
 * {@code /api/auth/me} on mount. The `alive` guard prevents state updates
 * after the consuming component unmounts.
 */
import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";

/** Profile data returned by the {@code /api/auth/me} endpoint. */
export type AuthMe = {
    id: string;
    email: string;
    roles?: string[];
    role?: string;
};

/**
 * Fetches the authenticated user's profile once on mount.
 *
 * @returns An object with:
 *   - {@code me} — the resolved {@link AuthMe} profile, or {@code null} if unauthenticated or on error.
 *   - {@code loading} — {@code true} while the request is in-flight.
 */
export default function useAuthMe(): { me: AuthMe | null; loading: boolean } {
    const [me, setMe] = useState<AuthMe | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await api.get<AuthMe>("/api/auth/me");
                if (alive) setMe(res.data);
            } catch {
                if (alive) setMe(null);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    return { me, loading };
}
