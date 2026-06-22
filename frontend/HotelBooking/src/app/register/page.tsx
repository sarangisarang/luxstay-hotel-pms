"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { API_BASE, saveToken } from "@/utils/auth";
import { Hotel, AlertCircle } from "lucide-react";
import styles from "@/styles/Auth.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [phone,           setPhone]           = useState("");
  const [address,         setAddress]         = useState("");
  const [dateOfBirth,     setDateOfBirth]     = useState("");
  const [loading,         setLoading]         = useState(false);

  // Public self-registration always creates a regular USER (guest) account.
  // Staff/admin accounts are provisioned by an administrator, never self-served.
  const role = "USER";
  const [error,           setError]           = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, firstName, lastName, phone, address, dateOfBirth }),
      });

      const raw  = await res.text();
      const data = raw
        ? (() => { try { return JSON.parse(raw); } catch { return raw; } })()
        : null;

      if (!res.ok) {
        const msg =
          (data as Record<string, string>)?.message ??
          (data as Record<string, string>)?.error ??
          raw ??
          `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const token = (data as Record<string, string>)?.token;
      if (!token) throw new Error("No token received");
      saveToken(token);

      const roleFromToken = (data as Record<string, string>)?.role ?? "USER";
      router.push(roleFromToken === "ADMIN" || roleFromToken === "RECEPTION" ? "/dashboard" : "/room-types");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Left hero panel */}
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
            Join thousands of<br />hotel professionals.
          </h1>
          <p className={styles.panelSub}>
            Create your account and start managing bookings, guests, and your entire property in minutes.
          </p>

          <div className={styles.panelStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>5 min</span>
              <span className={styles.statLabel}>Setup</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>Free</span>
              <span className={styles.statLabel}>Trial</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>3</span>
              <span className={styles.statLabel}>User roles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.formSide}>
        <div className={`${styles.formCard} ${styles.formCardWide}`}>
          {/* Mobile logo */}
          <div className={styles.mobileLogo}>
            <div className={styles.mobileLogoIcon}>
              <Hotel size={20} color="white" />
            </div>
            <span className={styles.mobileLogoName}>LuxStay</span>
          </div>

          <h2 className={styles.formTitle}>Create account</h2>
          <p className={styles.formSub}>Fill in your details to get started.</p>

          {error && (
            <div className={styles.error}>
              <AlertCircle size={16} className={styles.errorIcon} />
              {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            {/* Name row */}
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reg-first">First Name</label>
                <input id="reg-first" className={styles.input} type="text" required value={firstName}
                  placeholder="John" onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reg-last">Last Name</label>
                <input id="reg-last" className={styles.input} type="text" required value={lastName}
                  placeholder="Doe" onChange={e => setLastName(e.target.value)} />
              </div>
            </div>

            {/* Phone + DOB */}
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reg-phone">{t('phone')}</label>
                <input id="reg-phone" className={styles.input} type="tel" required value={phone}
                  placeholder="+1 555 000 0000" onChange={e => setPhone(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reg-dob">Date of Birth</label>
                <input id="reg-dob" className={styles.input} type="date" required value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)} />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-address">Address</label>
              <input id="reg-address" className={styles.input} type="text" required value={address}
                placeholder="123 Main St, City" onChange={e => setAddress(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reg-email">{t('email')}</label>
              <input id="reg-email" className={styles.input} type="email" required value={email}
                placeholder="you@example.com" autoComplete="email" onChange={e => setEmail(e.target.value)} />
            </div>

            {/* Password row */}
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reg-pass">Password</label>
                <input id="reg-pass" className={styles.input} type="password" required value={password}
                  placeholder="••••••••" autoComplete="new-password" onChange={e => setPassword(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reg-confirm">Confirm Password</label>
                <input id="reg-confirm" className={styles.input} type="password" required value={confirmPassword}
                  placeholder="••••••••" autoComplete="new-password" onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className={styles.formFooter}>
            Already have an account?{" "}
            <Link href="/login" className={styles.formLink}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
