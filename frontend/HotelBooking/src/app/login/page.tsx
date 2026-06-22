"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import { Hotel, AlertCircle } from "lucide-react";
import styles from "@/styles/Auth.module.css";

type LoginResponse = {
  token?: string;
  accessToken?: string;
  role?: string;
  email?: string;
  roles?: string[];
};

function tryDecodeRole(jwt: string): string | undefined {
  try {
    const payload = JSON.parse(
      atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (Array.isArray(payload.roles) && payload.roles.length > 0)
      return String(payload.roles[0]).replace(/^ROLE_/, "");
    if (payload.role) return String(payload.role).replace(/^ROLE_/, "");
    return undefined;
  } catch {
    return undefined;
  }
}

// Only these exact emails may use the one-click demo login shortcut.
const DEMO_EMAILS = new Set(["admin@demo.com", "reception@demo.com", "guest@demo.com"]);

export default function LoginPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const { t, i18n }  = useTranslation();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState<string | null>(null);

  // Auto-login ONLY for predefined demo accounts arriving from the landing page.
  // Credentials are stripped from the URL immediately so they never appear
  // in browser history, analytics referrers, or server logs.
  useEffect(() => {
    const demoEmail = searchParams.get("demo_email")?.toLowerCase() ?? "";
    const demoPass  = searchParams.get("demo_password") ?? "";

    if (!DEMO_EMAILS.has(demoEmail) || !demoPass) return;

    // Replace URL immediately — removes credentials from address bar and history
    window.history.replaceState(null, "", "/login");

    setEmail(demoEmail);
    setPassword(demoPass);
    doLogin(demoEmail, demoPass);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doLogin(loginEmail: string, loginPassword: string) {
    setLoading(true);
    setErr(null);
    try {
      const res  = await api.post<LoginResponse>("/api/auth/login", { email: loginEmail, password: loginPassword });
      const data = res.data ?? {};
      const token = data.token ?? data.accessToken;
      if (!token) { setErr(t("token_missing")); return; }
      localStorage.setItem("token", token);
      const role =
        data.role ??
        (data.roles?.length ? String(data.roles[0]).replace(/^ROLE_/, "") : undefined) ??
        tryDecodeRole(token);
      if (role) localStorage.setItem("role", role);
      if (data.email) localStorage.setItem("email", data.email);
      document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "role=; path=/; max-age=0; SameSite=Lax";
      const maxAge = 60 * 60 * 24;
      document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      if (role) document.cookie = `role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
      router.push(role === "ADMIN" ? "/admin" : role === "USER" ? "/profile" : "/dashboard");
    } catch (e: unknown) {
      const axErr = e as { response?: { data?: { message?: string; error?: string } }; message?: string };
      setErr(axErr?.response?.data?.message ?? axErr?.response?.data?.error ?? axErr?.message ?? t("login_failed"));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doLogin(email, password);
  }

  return (
    <div className={styles.page}>
      {/* ===== Left hero panel ===== */}
      <div className={styles.panel}>
        <div className={styles.panelBg} />
        <div className={styles.panelOverlay} />
        <div className={styles.panelContent}>
          <div className={styles.panelLogo}>
            <div className={styles.panelLogoIcon}>
              <Hotel size={22} color="white" />
            </div>
            <span className={styles.panelLogoName}>LuxStay</span>
          </div>

          <h1 className={styles.panelHeadline}>
            Manage your hotel<br />with confidence.
          </h1>
          <p className={styles.panelSub}>
            One platform for bookings, guests, staff, payments and real-time analytics — built for modern hospitality.
          </p>

          <div className={styles.panelStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>98%</span>
              <span className={styles.statLabel}>Uptime</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>500+</span>
              <span className={styles.statLabel}>Properties</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>24/7</span>
              <span className={styles.statLabel}>Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Right form panel ===== */}
      <div className={styles.formSide}>
        <div className={styles.formCard}>
          {/* Mobile logo */}
          <div className={styles.mobileLogo}>
            <div className={styles.mobileLogoIcon}>
              <Hotel size={20} color="white" />
            </div>
            <span className={styles.mobileLogoName}>LuxStay</span>
          </div>

          <h2 className={styles.formTitle}>{t("login")}</h2>
          <p className={styles.formSub}>Welcome back — sign in to your account.</p>

          {/* Language switcher */}
          <div className={styles.langRow}>
            <button type="button" className={styles.langBtn} onClick={() => i18n.changeLanguage("ka")}>🇬🇪 GEO</button>
            <button type="button" className={styles.langBtn} onClick={() => i18n.changeLanguage("en")}>🇬🇧 ENG</button>
            <button type="button" className={styles.langBtn} onClick={() => i18n.changeLanguage("de")}>🇩🇪 DEU</button>
          </div>

          {err && (
            <div className={styles.error}>
              <AlertCircle size={16} className={styles.errorIcon} />
              {err}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-email">{t("email")}</label>
              <input
                id="login-email"
                className={styles.input}
                type="email"
                value={email}
                placeholder="you@example.com"
                autoComplete="email"
                required
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-password">{t("password")}</label>
              <input
                id="login-password"
                className={styles.input}
                type="password"
                value={password}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? "Signing in…" : t("login")}
            </button>
          </form>

          <p className={styles.formFooter}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className={styles.formLink}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
