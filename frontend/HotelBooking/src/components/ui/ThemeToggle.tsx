"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
    const { t } = useTranslation();
    const [dark, setDark] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("theme");
            const isDark = stored === "dark";
            setDark(isDark);
            document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
        } catch {}
    }, []);

    function toggle() {
        const next = !dark;
        setDark(next);
        try {
            localStorage.setItem("theme", next ? "dark" : "light");
            document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
        } catch {}
    }

    return (
        <button
            type="button"
            onClick={toggle}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
                display: "flex",
                alignItems: "center",
                gap: compact ? 0 : 8,
                padding: compact ? "6px 8px" : "8px 14px",
                background: "rgba(99,102,241,0.18)",
                border: "1px solid rgba(99,102,241,0.35)",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#a5b4fc",
                fontFamily: "inherit",
                transition: "all 150ms ease",
                width: compact ? "auto" : "100%",
            }}
        >
            <span style={{ fontSize: 15 }}>{dark ? "☀️" : "🌙"}</span>
            {!compact && <span>{dark ? "Light mode" : "Dark mode"}</span>}
        </button>
    );
}
