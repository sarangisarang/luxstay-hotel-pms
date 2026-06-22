/**
 * @file uiSafe.ts
 * Guards for safely converting arbitrary API values to strings before rendering.
 * The backend sometimes returns nested objects (e.g. {@code roomType}, {@code guest})
 * where a primitive was expected. Passing such values directly to JSX throws a
 * "Objects are not valid as a React child" runtime error — these helpers prevent that.
 */

/**
 * Converts any value to a display-safe string without throwing.
 *
 * Resolution order:
 * 1. {@code null} / {@code undefined} → {@code fallback} (default {@code "-"}).
 * 2. Primitive ({@code string}, {@code number}, {@code boolean}) → {@code String(v)}.
 * 3. Object → inspects common identifier fields in priority order:
 *    {@code name} → {@code title} → {@code roomNumber} → {@code id} → {@code JSON.stringify}.
 * 4. {@code JSON.stringify} failure → {@code fallback}.
 *
 * @param v        - The value to convert (accepts {@code any} because API shapes vary).
 * @param fallback - String returned when the value is absent or un-stringifiable.
 * @returns A non-empty display string, or {@code fallback}.
 */
export function safeText(v: unknown, fallback = "-"): string {
    if (v === null || v === undefined) return fallback;

    const t = typeof v;
    if (t === "string") return v as string;
    if (t === "number" || t === "boolean") return String(v);

    if (t === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.name === "string") return o.name;
        if (typeof o.title === "string") return o.title;
        if (typeof o.roomNumber === "string" || typeof o.roomNumber === "number") return String(o.roomNumber);
        if (typeof o.id === "string") return o.id;

        try {
            return JSON.stringify(o);
        } catch {
            return fallback;
        }
    }
    return fallback;
}
