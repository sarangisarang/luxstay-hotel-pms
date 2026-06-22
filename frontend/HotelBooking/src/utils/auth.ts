/**
 * @file auth.ts
 * Client-side authentication utilities: JWT decoding, token persistence, and
 * an authenticated fetch wrapper. All storage operations are guarded against
 * SSR (server-side rendering) environments where `window` is unavailable.
 */

/** Base URL of the backend API. Configurable via NEXT_PUBLIC_API_BASE env variable. */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

/** Shape of the decoded JWT payload used by this application. */
type JWTPayload = {
    exp?: number;
    role?: string;
    roles?: string[];
    email?: string;
    [k: string]: unknown;
};

/**
 * Removes the {@code ROLE_} prefix from a role string if present.
 * Returns {@code null} for empty or falsy values.
 *
 * @param r - Raw role string (e.g. "ROLE_ADMIN" or "ADMIN")
 * @returns Normalized role (e.g. "ADMIN") or null
 */
function normalizeRole(r?: string | null): string | null {
    if (!r) return null;
    return r.replace(/^ROLE_/, "");
}

/**
 * Extracts the first role from a decoded JWT payload.
 * Checks the {@code roles} array first, then the scalar {@code role} field.
 *
 * @param payload - Decoded JWT payload object
 * @returns Normalized role string, or null if absent
 */
function extractRole(payload: JWTPayload | null): string | null {
    if (!payload) return null;
    if (Array.isArray(payload.roles) && payload.roles.length > 0) {
        return normalizeRole(payload.roles[0] as string);
    }
    if (payload.role) return normalizeRole(payload.role);
    return null;
}

/**
 * Decodes the payload section of a JWT without signature verification.
 * Safe for client-side use; do NOT use this to make authorization decisions on the server.
 *
 * @param token - Compact JWT string (header.payload.signature)
 * @returns Parsed payload object, or null if the token is malformed
 */
export function decodeJwt(token: string): JWTPayload | null {
    try {
        const base64 = token.split(".")[1];
        if (!base64) return null;
        // Replace URL-safe chars, then decode Base64
        const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(decodeURIComponent(escape(json))) as JWTPayload;
    } catch {
        return null;
    }
}

/**
 * Persists a JWT and its derived metadata (expiry timestamp, role, email)
 * into {@code localStorage} so they are accessible across page navigations.
 *
 * @param token - The compact JWT string received from the server
 */
export function saveToken(token: string): void {
    const payload = decodeJwt(token);
    const expMs = payload?.exp ? payload.exp * 1000 : 0;

    localStorage.setItem("token", token);
    if (expMs) localStorage.setItem("token_exp", String(expMs));

    const role = extractRole(payload);
    if (role) localStorage.setItem("role", role);
    if (payload?.email) localStorage.setItem("email", String(payload.email));
}

/**
 * Retrieves the stored JWT from {@code localStorage}.
 * Returns {@code null} in SSR environments or when no token is stored.
 *
 * @returns The JWT string, or null
 */
export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
}

/**
 * Checks whether the stored token's expiry timestamp has passed.
 * Returns {@code false} (not expired) when no expiry is stored,
 * allowing the server to be the authoritative validator.
 *
 * @returns {@code true} if the token is expired; {@code false} otherwise
 */
export function isTokenExpired(): boolean {
    const exp = Number(localStorage.getItem("token_exp") ?? 0);
    return Boolean(exp) && Date.now() > exp;
}

/**
 * Wrapper around the native {@code fetch} API that automatically appends
 * the stored JWT as an {@code Authorization: Bearer <token>} header.
 * Throws on 401/403 responses to allow callers to redirect to login.
 *
 * @param input - URL or Request object
 * @param init  - Optional fetch init options (headers, method, body, etc.)
 * @returns The successful fetch Response
 * @throws Error if the response status is 401 or 403
 */
export async function authFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers ?? {});
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401 || res.status === 403) {
        throw new Error("Session expired. Please login again.");
    }
    return res;
}
