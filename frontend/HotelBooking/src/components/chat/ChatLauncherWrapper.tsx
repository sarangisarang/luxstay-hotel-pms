"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion"; // optional beautiful animation
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

const ChatLauncherNoSSR = dynamic(() => import("./ChatLauncher"), {
    ssr: false,
});

export default function ChatLauncherWrapper() {
  const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    // Target user for testing (admin/hotel staff)
    const targetUserId =
        process.env.NEXT_PUBLIC_CHAT_TARGET_USER_ID ||
        "00000000-0000-0000-0000-000000000001";

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end space-y-3">
            {/* ✅ Open Chat button */}
            {!visible && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => setVisible(true)}
                    className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-2xl shadow-2xl flex items-center justify-center animate-bounce"
                    aria-label="Open chat"
                    title="Open chat"
                >
                    💬
                </motion.button>
            )}

            {/* ✅ Chat window (fade-in animation) */}
            {visible && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="w-80 h-96 bg-white rounded-2xl shadow-2xl border overflow-hidden relative">
                        <div className="flex items-center justify-between bg-blue-600 text-white px-4 py-2">
                            <span className="font-semibold">Chat</span>
                            <button
                                onClick={() => setVisible(false)}
                                className="text-white opacity-90 hover:opacity-100"
                            >
                                ✕
                            </button>
                        </div>
                        {/* Embed real chat */}
                        <div className="h-[calc(100%-2.5rem)]">
                            <ChatLauncherNoSSR
                                bookingId="global-chat"
                                currentUserId="admin-001"
                                hotelId="hotel-001"
                                receiverId={targetUserId}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
