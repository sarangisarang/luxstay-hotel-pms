/** @type {import('next').NextConfig} */

// Origins the browser talks to besides this site: the API (when called
// directly instead of through the /api rewrite), Stripe and Google Maps.
// Same fallback as the pages that call the API directly (see app/book/*).
const apiBase = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080").replace(/\/+$/, "");
const apiWs = apiBase.replace(/^http/, "ws");

/**
 * Content-Security-Policy. 'unsafe-inline' for scripts is still needed by the
 * Next.js runtime without nonces; the policy mainly blocks framing
 * (clickjacking), plugins, foreign form targets and unknown script/connect
 * origins. Only sent in production (the dev server needs eval).
 */
const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `img-src 'self' data: blob: https: ${apiBase}`.trim(),
    `connect-src 'self' ${apiBase} ${apiWs} https://api.stripe.com https://*.stripe.com`.replace(/\s+/g, " ").trim(),
    "frame-src https://js.stripe.com https://hooks.stripe.com https://maps.google.com https://www.google.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join("; ");

const securityHeaders = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    // Keeps tokens in /book/manage?token=… out of Referer headers to other sites
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    // Ignored by browsers on plain http (local development)
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

const nextConfig = {
    output: "standalone",
    poweredByHeader: false,

    images: {
        remotePatterns: [
            { protocol: "http",  hostname: "localhost",              port: "8080" },
            { protocol: "http",  hostname: "localhost",              port: "3000" },
            { protocol: "https", hostname: "*.ngrok-free.app"                     },
            { protocol: "https", hostname: "*.trycloudflare.com"                  },
            { protocol: "https", hostname: "images.unsplash.com"                  },
        ],
    },

    async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
    },

    async rewrites() {
        const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
        return [
            {
                source:      "/api/:path*",
                destination: `${backendUrl}/api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
