import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE || "",
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];
let failSubscribers:   Array<(err: unknown)   => void> = [];

function subscribeTokenRefresh(
    onSuccess: (token: string) => void,
    onFailure: (err: unknown) => void,
): void {
    refreshSubscribers.push(onSuccess);
    failSubscribers.push(onFailure);
}

function onRefreshed(token: string): void {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
    failSubscribers    = [];
}

function onRefreshFailed(err: unknown): void {
    failSubscribers.forEach(cb => cb(err));
    refreshSubscribers = [];
    failSubscribers    = [];
}

api.interceptors.request.use((config) => {
    const url = config.url ?? "";
    if (url.startsWith("/api/auth/")) return config;

    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers = config.headers ?? {};
            (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status !== 401 ||
            originalRequest._retry ||
            typeof window === "undefined"
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        // Another refresh already in-flight — queue and wait
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                subscribeTokenRefresh(
                    (token) => {
                        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    },
                    (err) => reject(err),
                );
            });
        }

        isRefreshing = true;

        try {
            const oldToken = localStorage.getItem("token");
            if (!oldToken) throw new Error("No token in storage");

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080"}/api/auth/refresh`,
                { token: oldToken },
            );

            // Backend returns `token` field (login also uses `token ?? accessToken`)
            const newToken: string = res.data.token ?? res.data.accessToken;
            if (!newToken) throw new Error("Refresh response missing token");

            localStorage.setItem("token", newToken);
            api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
            onRefreshed(newToken);

            (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
            return api(originalRequest);

        } catch (err) {
            onRefreshFailed(err);
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("email");
            document.cookie = "token=; path=/; max-age=0";
            window.location.href = "/login";
            return Promise.reject(err);
        } finally {
            isRefreshing = false;
        }
    },
);

export default api;
