"use client";
import { useEffect, useRef, useState } from "react";
import api from "@/components/lib/axiosConfig";
import ChatWidget from "@/components/chat/ChatWidget";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

/**
 * Lightweight shape expected from backend /api/users list/search
 */
type UserLite = {
    id: string;
    fullName?: string;
    email: string;
    role?: string;
};

export default function UsersListWithChat() {
  const { t } = useTranslation();
    // Search field state
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);

    // Users data
    const [users, setUsers] = useState<UserLite[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Active chat state
    const [activeUser, setActiveUser] = useState<UserLite | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);

    /**
     * Fetch user list from backend.
     * It uses a debounce to avoid too many requests while typing.
     */
    useEffect(() => {
        let ignore = false;

        async function fetchUsers() {
            setError(null);
            setLoading(true);
            try {
                // You can adjust these endpoints to match your backend
                const url =
                    debouncedQuery && debouncedQuery.trim().length >= 2
                        ? `/api/users/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`
                        : `/api/users?limit=20`;
                const res = await api.get<UserLite[]>(url);
                if (!ignore) setUsers(res.data || []);
            } catch (e: any) {
                if (!ignore)
                    setError(
                        e?.response?.data?.message ||
                        e.message ||
                        "Failed to load users list"
                    );
            } finally {
                if (!ignore) setLoading(false);
            }
        }

        fetchUsers();
        return () => {
            ignore = true;
        };
    }, [debouncedQuery]);

    /**
     * Start a chat with the selected user.
     * This assumes your backend supports /api/chat/start or /api/chat/support/start/{id}
     */
    async function handleStartChat(u: UserLite) {
        setError(null);
        setActiveUser(u);
        setConversationId(null);

        try {
            const res = await api.post("/api/chat/start", { userB: u.id });
            setConversationId(res.data?.id);
        } catch (e1: any) {
            // fallback: support chat endpoint
            try {
                const res2 = await api.post(`/api/chat/support/start/${u.id}`);
                setConversationId(res2.data?.id);
            } catch (e2: any) {
                setError(
                    e2?.response?.data?.message || e2.message || "Could not start chat"
                );
                setActiveUser(null);
            }
        }
    }

    return (
        <div className="space-y-4">
            {/* Search input */}
            <div>
                <label className="block text-sm mb-1 font-medium text-gray-700">
                    Search users (name or email)
                </label>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. beka@hotel.com or Beka"
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {loading && <div className="text-sm text-gray-500">Loading users…</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}

            {/* Users table */}
            <div className="overflow-auto border rounded-lg bg-white shadow">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                    <tr>
                        <th className="text-left font-medium px-3 py-2">{t('name')}</th>
                        <th className="text-left font-medium px-3 py-2">{t('email')}</th>
                        <th className="text-left font-medium px-3 py-2">Role</th>
                        <th className="text-right font-medium px-3 py-2">{t('actions')}</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                    {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{u.fullName || "—"}</td>
                            <td className="px-3 py-2">{u.email}</td>
                            <td className="px-3 py-2">{u.role || "USER"}</td>
                            <td className="px-3 py-2">
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => handleStartChat(u)}
                                        className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition"
                                    >
                                        💬 Chat
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && !loading && (
                        <tr>
                            <td
                                colSpan={4}
                                className="px-3 py-6 text-center text-gray-500 italic"
                            >
                                No users found
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* Floating chat window for selected user */}
            {conversationId && activeUser && (
                <div className="fixed right-4 bottom-4 z-50">
                    <ChatWidget
                        bookingId={conversationId}
                        currentUserId="admin-001" // ← adjust according to your auth system
                        receiverId={activeUser.id}
                        hotelId="hotel-001"
                    />
                </div>
            )}
        </div>
    );
}

/**
 * Simple debounce hook — prevents rapid re-fetching during typing.
 */
function useDebounce<T>(value: T, delay = 300): T {
    const [v, setV] = useState(value);
    const t = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (t.current) clearTimeout(t.current);
        t.current = setTimeout(() => setV(value), delay);
        return () => {
            if (t.current) clearTimeout(t.current);
        };
    }, [value, delay]);

    return v;
}
