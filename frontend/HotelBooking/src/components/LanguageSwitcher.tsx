"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import "@/app/i18n";
import i18n from "i18next";

const LANGUAGES = [
    { code: "en", flag: "🇬🇧", name: "English" },
    { code: "ka", flag: "🇬🇪", name: "ქართული" },
    { code: "de", flag: "🇩🇪", name: "Deutsch" },
    { code: "fr", flag: "🇫🇷", name: "Français" },
    { code: "es", flag: "🇪🇸", name: "Español" },
    { code: "it", flag: "🇮🇹", name: "Italiano" },
    { code: "pt", flag: "🇧🇷", name: "Português" },
    { code: "ru", flag: "🇷🇺", name: "Русский" },
    { code: "ar", flag: "🇸🇦", name: "العربية", rtl: true },
    { code: "zh", flag: "🇨🇳", name: "中文" },
    { code: "ja", flag: "🇯🇵", name: "日本語" },
    { code: "ko", flag: "🇰🇷", name: "한국어" },
    { code: "tr", flag: "🇹🇷", name: "Türkçe" },
    { code: "nl", flag: "🇳🇱", name: "Nederlands" },
    { code: "pl", flag: "🇵🇱", name: "Polski" },
    { code: "ro", flag: "🇷🇴", name: "Română" },
    { code: "uk", flag: "🇺🇦", name: "Українська" },
    { code: "hi", flag: "🇮🇳", name: "हिन्दी" },
];

export default function LanguageSwitcher() {
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState("en");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const stored = localStorage.getItem("i18n-lang");
        const lang = stored ?? i18n.language ?? "en";
        const matched = LANGUAGES.find(l => l.code === lang) ? lang : "en";
        setCurrent(matched);
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    function switchLang(code: string) {
        const lang = LANGUAGES.find(l => l.code === code);
        i18n.changeLanguage(code);
        localStorage.setItem("i18n-lang", code);
        setCurrent(code);
        setOpen(false);
        document.documentElement.dir = lang?.rtl ? "rtl" : "ltr";
        document.documentElement.lang = code;
    }

    const activeLang = LANGUAGES.find(l => l.code === current) ?? LANGUAGES[0];

    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button
                type="button"
                title="Change language"
                aria-label="Language selector"
                onClick={() => setOpen(v => !v)}
                style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: open ? "#f1f5f9" : "transparent",
                    border: "1px solid", borderColor: open ? "#cbd5e1" : "transparent",
                    borderRadius: 8, padding: "5px 8px", cursor: "pointer",
                    fontSize: "0.8rem", fontWeight: 600, color: "#374151",
                    transition: "all 0.15s",
                }}
            >
                <Globe size={15} color="#6366f1" />
                <span style={{ fontSize: "1rem" }}>{activeLang.flag}</span>
                <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>{activeLang.code.toUpperCase()}</span>
            </button>

            {open && (
                <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999,
                    minWidth: 200, maxHeight: 360, overflowY: "auto",
                    padding: "6px 0",
                }}>
                    {LANGUAGES.map(lang => (
                        <button
                            key={lang.code}
                            type="button"
                            onClick={() => switchLang(lang.code)}
                            style={{
                                display: "flex", alignItems: "center", gap: 10,
                                width: "100%", padding: "8px 14px",
                                background: current === lang.code ? "#f0f4ff" : "transparent",
                                border: "none", cursor: "pointer", textAlign: "left",
                                fontSize: "0.85rem", color: current === lang.code ? "#4f46e5" : "#374151",
                                fontWeight: current === lang.code ? 700 : 400,
                                transition: "background 0.1s",
                            }}
                            onMouseEnter={e => { if (current !== lang.code) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                            onMouseLeave={e => { if (current !== lang.code) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                            <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{lang.flag}</span>
                            <span style={{ flex: 1 }}>{lang.name}</span>
                            {current === lang.code && <span style={{ color: "#4f46e5", fontSize: "0.75rem" }}>✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
