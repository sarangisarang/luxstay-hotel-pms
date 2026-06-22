
"use client";

import AddGuestForm from "../../components/forms/AddGuestForm";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function AddGuestPage() {
  const { t } = useTranslation();
    return (
        <div className="pl-64 pr-4 w-full flex flex-col items-center justify-start min-h-screen overflow-x-auto">
            <AddGuestForm />
        </div>
    );
}
