/**
 * @file imageHelper.ts
 * Utility for building fully-qualified image URLs from the partial paths
 * stored in the database. Supports hotel, room, and room-type image sub-directories.
 *
 * Configure the backend origin via the {@code NEXT_PUBLIC_API_BASE} environment
 * variable; falls back to {@code http://localhost:8080} for local development.
 */

/** Backend origin used as the prefix for all generated image URLs. */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

/**
 * Builds a fully-qualified public image URL from a raw path or filename.
 *
 * Resolution order:
 * 1. If {@code raw} is falsy, returns an empty string (safe for `<img src>`).
 * 2. If {@code raw} is already an absolute URL (`http://` / `https://`), returns it as-is.
 * 3. If {@code raw} contains {@code /uploads/}, prepends {@link BASE_URL} directly.
 * 4. Otherwise, extracts the bare filename and constructs the canonical path
 *    {@code <BASE_URL>/uploads/<type>/<filename>}.
 *
 * @param raw  - Stored value from the API: a filename, a relative path, or an absolute URL.
 * @param type - Image category that determines the upload sub-directory.
 *               One of {@code "hotel"}, {@code "room"}, or {@code "roomtype"} (default).
 * @returns A fully-qualified URL string, or an empty string when {@code raw} is absent.
 */
export function getImageUrl(
    raw?: string,
    type: "hotel" | "room" | "roomtype" = "roomtype"
): string {
    if (!raw) return "";

    if (/^https?:\/\//i.test(raw)) return raw;

    if (raw.includes("/uploads/")) {
        return `${BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
    }

    const file = (raw.split("/").pop() || raw).trim();
    const subdir =
        type === "hotel" ? "hotel/" : type === "room" ? "room/" : "roomtype/";
    return `${BASE_URL}/uploads/${subdir}${file}`;
}