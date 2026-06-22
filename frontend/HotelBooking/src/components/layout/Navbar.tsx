"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function Navbar() {
  const { t } = useTranslation();
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsAuthenticated(!!token);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token"); // Remove saved token
        setIsAuthenticated(false);
        router.push("/login"); // Redirect to login
    };

    return (
        <nav className="flex justify-between items-center p-4 bg-gray-900 text-white shadow-md">
            <h1
                className="text-lg font-bold cursor-pointer"
                onClick={() => router.push("/")}
            >
                Hotel Booking
            </h1>
            <div className="flex gap-4">
                {isAuthenticated ? (
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition"
                    >
                        Logout
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => router.push("/login")}
                            className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 transition"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => router.push("/register")}
                            className="bg-green-500 px-4 py-2 rounded hover:bg-green-600 transition"
                        >
                            Register
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
