import { NextRequest, NextResponse } from "next/server";

// Routes only ADMIN can visit
const ADMIN_ONLY = [
    "/add-hotel", "/add-room", "/add-room-type", "/add-service",
    "/add-employees", "/employees", "/invoices",
    "/rate-plans", "/pricing-rules", "/campaigns",
    "/ai-audit", "/ai-knowledge", "/ai-monitor",
    "/reports", "/kpi", "/pace-report", "/image-upload", "/admin",
    "/chain", "/webhooks", "/staff", "/audit-log", "/pricing-calendar", "/reconciliation",
    "/revenue-optimizer", "/guest-analytics", "/hotel-settings", "/vouchers",
    "/revenue-by-channel", "/night-audit", "/corporate", "/financials",
    "/booking-trends", "/repeat-guests",
];

// Routes ADMIN + RECEPTION can visit (USER gets redirected to /profile)
const STAFF_ONLY = [
    "/hotel", "/rooms", "/room-types", "/room-calendar", "/room-gantt",
    "/guests", "/add-guest", "/bookings", "/add-bookings", "/manifest",
    "/payments", "/add-payment", "/services", "/add-service",
    "/service-requests", "/add-service-request",
    "/housekeeping", "/maintenance", "/loyalty", "/crm", "/inventory", "/forecast", "/groups",
    "/concierge",
    "/pos", "/channel-manager", "/checkins", "/guest-checkin",
    "/search-filter", "/dashboard", "/add-booking", "/operations",
];

/** Decode role from JWT payload without verifying the signature. */
function getRoleFromJwt(token: string): string | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        // atob is available in Next.js edge runtime
        const payload = JSON.parse(
            Buffer.from(parts[1], "base64").toString("utf-8")
        );
        if (Array.isArray(payload.roles) && payload.roles.length > 0) {
            return String(payload.roles[0]).replace(/^ROLE_/, "");
        }
        if (payload.role) return String(payload.role).replace(/^ROLE_/, "");
        return null;
    } catch {
        return null;
    }
}

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Always allow public paths
    if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/book") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname === "/"
    ) return NextResponse.next();

    const token = req.cookies.get("token")?.value ?? null;

    // Not logged in → login page
    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Always derive role from the JWT — never trust the role cookie alone
    const role = getRoleFromJwt(token) ?? req.cookies.get("role")?.value ?? null;

    if (!role) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Admin-only check
    if (ADMIN_ONLY.some(p => pathname === p || pathname.startsWith(p + "/"))) {
        if (role !== "ADMIN") {
            const url = req.nextUrl.clone();
            url.pathname = role === "USER" ? "/profile" : "/hotel";
            return NextResponse.redirect(url);
        }
    }

    // Staff-only check
    if (STAFF_ONLY.some(p => pathname === p || pathname.startsWith(p + "/"))) {
        if (role === "USER") {
            const url = req.nextUrl.clone();
            url.pathname = "/profile";
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
