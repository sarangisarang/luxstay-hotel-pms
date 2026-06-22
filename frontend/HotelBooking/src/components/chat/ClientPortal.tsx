"use client";
import ChatLauncher from "./ChatLauncher";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function ClientPortal() {
  const { t } = useTranslation();
    const bookingId = "test-booking-001";
    const currentUserId = "guest1";

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center relative">
            <h1 className="text-2xl font-semibold">Welcome to the client portal</h1>

            {/* ✅ place chat launcher here */}
            <ChatLauncher bookingId={bookingId} currentUserId={currentUserId} />
        </div>
    );
}

