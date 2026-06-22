/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",

    images: {
        remotePatterns: [
            { protocol: "http",  hostname: "localhost",              port: "8080" },
            { protocol: "http",  hostname: "localhost",              port: "3000" },
            { protocol: "https", hostname: "*.ngrok-free.app"                     },
            { protocol: "https", hostname: "*.trycloudflare.com"                  },
            { protocol: "https", hostname: "images.unsplash.com"                  },
        ],
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
