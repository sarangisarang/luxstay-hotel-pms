"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Hotel,
  Bell,
  ChevronDown,
  LogOut,
  User,
  LayoutDashboard,
  Shield,
  CalendarCheck,
  Menu,
  CheckCheck,
} from "lucide-react";
import styles from "@/styles/Header.module.css";
import { useSidebar } from "@/context/SidebarContext";
import api from "@/components/lib/axiosConfig";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
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

function tryDecodeEmail(jwt: string): string | undefined {
  try {
    const payload = JSON.parse(
      atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload.email ?? payload.sub ?? undefined;
  } catch {
    return undefined;
  }
}

const ROLE_STYLE: Record<string, string> = {
  ADMIN:     styles.roleAdmin,
  RECEPTION: styles.roleReception,
  USER:      styles.roleUser,
};

function fmtNotifTime(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 1) return "just now";
    if (diffM < 60) return `${diffM}m ago`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  } catch { return ""; }
}

export default function Header() {
  const { t } = useTranslation();
  const router   = useRouter();
  const pathname = usePathname();
  const { toggleMobile } = useSidebar();

  const [mounted,       setMounted]       = useState(false);
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);
  const [role,          setRole]          = useState<string | null>(null);
  const [email,         setEmail]         = useState<string | null>(null);
  const [open,          setOpen]          = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const token       = localStorage.getItem("token");
    let storedRole    = localStorage.getItem("role");
    const storedEmail = localStorage.getItem("email");

    if (!storedRole && token) {
      const decoded = tryDecodeRole(token);
      if (decoded) { storedRole = decoded; localStorage.setItem("role", decoded); }
    }

    const resolvedEmail =
      storedEmail ?? (token ? tryDecodeEmail(token) : null) ?? null;

    setIsLoggedIn(!!token);
    setRole(storedRole);
    setEmail(resolvedEmail);
    setOpen(false);
    setNotifOpen(false);

    if (token) {
      api.get("/api/notifications/unread-count")
        .then(r => setUnreadCount(r.data?.count ?? 0))
        .catch(() => {});
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
        setOpen(false);
        setNotifOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setNotifOpen(false); }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function openNotifPanel() {
    const next = !notifOpen;
    setNotifOpen(next);
    setOpen(false);
    if (next) {
      api.get("/api/notifications")
        .then(r => setNotifications(Array.isArray(r.data) ? r.data.slice(0, 8) : []))
        .catch(() => {});
    }
  }

  function markAllRead() {
    api.post("/api/notifications/mark-all-read").catch(() => {});
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    setIsLoggedIn(false);
    setRole(null);
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : role?.slice(0, 2).toUpperCase() ?? "HB";

  const rolePillClass = role
    ? (ROLE_STYLE[role] ?? styles.roleDefault)
    : styles.roleDefault;

  if (!mounted) return <div className={styles.header} />;

  return (
    <header className={styles.header}>
      <div className={styles.backdrop} />

      <div className={styles.inner}>
        {/* Brand */}
        <Link href="/" className={styles.brand}>
          <div className={styles.brandIcon}>
            <Hotel size={18} color="white" />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>LuxStay</span>
            <span className={styles.brandSub}>Hotel Management</span>
          </div>
        </Link>

        {/* Hamburger — mobile only, shown when logged in (sidebar exists) */}
        {isLoggedIn && (
          <button
            type="button"
            aria-label="Open navigation"
            className={styles.hamburger}
            onClick={toggleMobile}
          >
            <Menu size={20} />
          </button>
        )}

        {/* Right controls */}
        <div className={styles.controls} ref={controlsRef}>
          {/* Book a Room — only for guests / unauthenticated */}
          {(!isLoggedIn || role === "USER") && (
            <Link href="/book" className={styles.bookBtn}>
              <CalendarCheck size={15} />
              {t('bookARoom')}
            </Link>
          )}

          {/* Notifications panel */}
          {isLoggedIn && (
            <div className={styles.notifWrapper}>
              <button
                type="button"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                aria-expanded={notifOpen}
                className={`${styles.bellBtn} ${notifOpen ? styles.bellBtnOpen : ""}`}
                onClick={openNotifPanel}
              >
                <Bell size={16} />
                {unreadCount > 0 ? (
                  <span className={styles.bellBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
                ) : (
                  <span className={styles.bellDot} />
                )}
              </button>

              {notifOpen && (
                <div className={styles.notifPanel}>
                  <div className={styles.notifPanelHead}>
                    <span className={styles.notifPanelTitle}>{t('notifications')}</span>
                    {unreadCount > 0 && (
                      <button type="button" className={styles.markAllBtn} onClick={markAllRead}>
                        <CheckCheck size={13} /> {t('markAllRead')}
                      </button>
                    )}
                  </div>
                  <div className={styles.notifList}>
                    {notifications.length === 0 ? (
                      <div className={styles.notifEmpty}>{t('noNotificationsYet')}</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`${styles.notifItem} ${n.read ? styles.notifRead : styles.notifUnread}`}>
                          <div className={styles.notifItemTitle}>{n.title}</div>
                          <div className={styles.notifItemMsg}>{n.message}</div>
                          <div className={styles.notifItemTime}>{fmtNotifTime(n.createdAt)}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <Link href="/notifications" className={styles.notifViewAll} onClick={() => setNotifOpen(false)}>
                    {t('viewAllNotifications')}
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* User / menu */}
          <div className={styles.menuWrapper}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              className={`${styles.menuBtn} ${open ? styles.menuBtnOpen : ""}`}
              onClick={() => { setOpen(v => !v); setNotifOpen(false); }}
            >
              {isLoggedIn ? (
                <>
                  <div className={styles.avatar}>{initials}</div>
                  <div className={styles.userInfo}>
                    <span className={styles.userEmail}>{email ?? "Account"}</span>
                    {role && <span className={`${styles.rolePill} ${rolePillClass}`}>{role}</span>}
                  </div>
                </>
              ) : (
                <span className={styles.menuLabel}>Menu</span>
              )}
              <ChevronDown
                size={14}
                className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
              />
            </button>

            {open && (
              <div role="menu" className={styles.dropdown}>
                {!isLoggedIn ? (
                  <>
                    <DropdownLink href="/login" icon={<User size={14} />} label={t('loginBtn')} onClick={() => setOpen(false)} />
                    <DropdownLink href="/register" icon={<User size={14} />} label={t('registerBtn')} onClick={() => setOpen(false)} />
                  </>
                ) : (
                  <>
                    {role === "ADMIN" && (
                      <DropdownLink href="/admin" icon={<Shield size={14} />} label={t('adminPanel')} onClick={() => setOpen(false)} />
                    )}
                    {(role === "ADMIN" || role === "RECEPTION") && (
                      <DropdownLink href="/dashboard" icon={<LayoutDashboard size={14} />} label={t('dashboard')} onClick={() => setOpen(false)} />
                    )}
                    <DropdownLink href="/profile" icon={<User size={14} />} label={t('myProfile')} onClick={() => setOpen(false)} />
                    <div className={styles.dropdownDivider} />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={logout}
                      className={styles.logoutItem}
                    >
                      <LogOut size={14} />
                      {t('logoutBtn')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function DropdownLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className={styles.dropdownItem}>
      <span className={styles.dropdownIcon}>{icon}</span>
      {label}
    </Link>
  );
}
