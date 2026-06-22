"use client";

import AddBooking from "@/components/forms/AddBooking";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function AddBookingsPage() {
  const { t } = useTranslation();
    return (
        <div className="fade-in">
            <AddBooking />
        </div>
    );
}