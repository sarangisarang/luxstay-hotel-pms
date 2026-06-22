// src/components/chat/ChatLauncher.tsx
"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Props = {
    bookingId: string;
    currentUserId: string;
    hotelId?: string;
    receiverId?: string;
};

export default function ChatLauncher({ bookingId, currentUserId, hotelId, receiverId }: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            {/* 💬 round button */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-2xl shadow-2xl flex items-center justify-center"
                    aria-label="Open chat"
                    title="Open chat"
                >
                    💬
                </button>
            )}

            {/* popup */}
            {open && (
                <div className="w-80 h-96 bg-white rounded-2xl shadow-2xl border overflow-hidden relative">
                    <div className="flex items-center justify-between bg-blue-600 text-white px-4 py-2">
                        <div className="font-semibold">Chat</div>
                        <button onClick={() => setOpen(false)} className="opacity-90 hover:opacity-100">✕</button>
                    </div>
                    <div className="p-3 text-sm text-gray-600">ChatWindow mounted (bookingId: {bookingId})</div>
                </div>
            )}
        </div>
    );
}
