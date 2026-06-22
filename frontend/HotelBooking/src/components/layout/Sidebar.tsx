"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/app/i18n";
import styles from "@/styles/Sidebar.module.css";
import { useSidebar } from "@/context/SidebarContext";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
    FaHotel, FaPlus, FaBed, FaDoorOpen, FaUsers, FaUserPlus,
    FaClipboardList, FaClipboardCheck, FaMoneyBillWave, FaUserTie,
    FaCog, FaTools, FaStickyNote, FaChartBar, FaBell, FaCalendarAlt,
    FaImage, FaSearch, FaFileAlt, FaDatabase, FaFileInvoiceDollar,
    FaChevronLeft, FaChevronRight, FaSignOutAlt, FaBroom, FaWrench,
    FaTag, FaStar, FaTachometerAlt, FaAddressBook, FaEnvelope,
    FaShoppingCart, FaGlobe, FaSlidersH, FaIdCard, FaRobot,
    FaCheckCircle, FaBook, FaHeartbeat, FaFlask,
} from "react-icons/fa";

/* ── helpers ─────────────────────────────────────────────────────────── */
function base64UrlDecode(input: string): string {
    let s = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4;
    if (pad === 2) s += "==";
    else if (pad === 3) s += "=";
    else if (pad !== 0) s += "==";
    return atob(s);
}
function getRoleFromToken(token: string): string | undefined {
    try {
        const payloadStr = base64UrlDecode(token.split(".")[1] ?? "");
        const payload = JSON.parse(payloadStr);
        if (Array.isArray(payload.roles) && payload.roles.length > 0)
            return String(payload.roles[0]).replace(/^ROLE_/, "");
        if (payload.role) return String(payload.role).replace(/^ROLE_/, "");
        return undefined;
    } catch { return undefined; }
}
function isDemoFromToken(token: string): boolean {
    try {
        const payloadStr = base64UrlDecode(token.split(".")[1] ?? "");
        const payload = JSON.parse(payloadStr);
        return payload.demoAccount === true;
    } catch { return false; }
}
function isTokenExpired(token: string): boolean {
    try {
        const payloadStr = base64UrlDecode(token.split(".")[1] ?? "");
        const { exp } = JSON.parse(payloadStr);
        return typeof exp === "number" && exp <= Math.floor(Date.now() / 1000);
    } catch { return true; }
}

/* ── types ───────────────────────────────────────────────────────────── */
type NavLink = {
    name: string;
    href: string;
    icon: JSX.Element;
    roles: string[];
};
type NavGroup = {
    id: string;
    label: string;       // shown directly (no i18n key needed for group headers)
    icon: JSX.Element;
    roles: string[];
    items: NavLink[];
};

/* ── standalone top links (always visible, no group) ─────────────────── */
const TOP_LINKS: NavLink[] = [
    { name: "dashboardAnalytics", href: "/dashboard",     icon: <FaTachometerAlt />, roles: ["ADMIN", "RECEPTION"] },
    { name: "notifications",      href: "/notifications", icon: <FaBell />,          roles: ["ADMIN", "RECEPTION", "USER"] },
];

/* ── grouped navigation ──────────────────────────────────────────────── */
const NAV_GROUPS: NavGroup[] = [
    {
        id: "dailyOps",
        label: "Daily Operations",
        icon: <FaCalendarAlt />,
        roles: ["ADMIN", "RECEPTION"],
        items: [
            { name: "dailyManifest",   href: "/manifest",      icon: <FaFileAlt />,     roles: ["ADMIN", "RECEPTION"] },
            { name: "checkInRequests", href: "/checkins",      icon: <FaCheckCircle />, roles: ["ADMIN", "RECEPTION"] },
            { name: "guestPortal",     href: "/guest-checkin", icon: <FaIdCard />,      roles: ["ADMIN", "RECEPTION"] },
            { name: "roomCalendar",    href: "/room-calendar", icon: <FaCalendarAlt />, roles: ["ADMIN", "RECEPTION"] },
            { name: "availabilityGantt", href: "/room-gantt", icon: <FaCalendarAlt />, roles: ["ADMIN", "RECEPTION"] },
            { name: "nightAudit",      href: "/night-audit",   icon: <FaFileAlt />,     roles: ["ADMIN"] },
        ],
    },
    {
        id: "reservations",
        label: "Reservations",
        icon: <FaClipboardList />,
        roles: ["ADMIN", "RECEPTION"],
        items: [
            { name: "bookingList",       href: "/bookings",       icon: <FaClipboardList />,  roles: ["ADMIN", "RECEPTION"] },
            { name: "addBookings",       href: "/add-bookings",   icon: <FaClipboardCheck />, roles: ["ADMIN", "RECEPTION"] },
            { name: "searchFilter",      href: "/search-filter",  icon: <FaSearch />,         roles: ["ADMIN", "RECEPTION"] },
            { name: "corporateAccounts", href: "/corporate",      icon: <FaUserTie />,        roles: ["ADMIN"] },
            { name: "bookingTrends",     href: "/booking-trends", icon: <FaChartBar />,       roles: ["ADMIN"] },
        ],
    },
    {
        id: "guests",
        label: "Guests",
        icon: <FaUsers />,
        roles: ["ADMIN", "RECEPTION", "USER"],
        items: [
            { name: "guests",            href: "/guests",            icon: <FaUsers />,      roles: ["ADMIN", "RECEPTION"] },
            { name: "addGuest",          href: "/add-guest",         icon: <FaUserPlus />,   roles: ["ADMIN", "RECEPTION"] },
            { name: "guest360Profiles",  href: "/crm",               icon: <FaAddressBook />,roles: ["ADMIN", "RECEPTION"] },
            { name: "myBookings",        href: "/guest-functions",   icon: <FaClipboardList />, roles: ["USER"] },
            { name: "feedbackReviews",   href: "/feedback",          icon: <FaStickyNote />, roles: ["ADMIN", "RECEPTION", "USER"] },
            { name: "addFeedbackReview", href: "/add-feedback-review", icon: <FaPlus />,    roles: ["ADMIN", "RECEPTION", "USER"] },
            { name: "repeatGuests",      href: "/repeat-guests",     icon: <FaUsers />,      roles: ["ADMIN"] },
        ],
    },
    {
        id: "rooms",
        label: "Rooms & Property",
        icon: <FaBed />,
        roles: ["ADMIN", "RECEPTION"],
        items: [
            { name: "rooms",             href: "/rooms",           icon: <FaDoorOpen />, roles: ["ADMIN", "RECEPTION"] },
            { name: "addRoom",           href: "/add-room",        icon: <FaPlus />,     roles: ["ADMIN"] },
            { name: "roomTypes",         href: "/room-types",      icon: <FaBed />,      roles: ["ADMIN", "RECEPTION"] },
            { name: "addRoomType",       href: "/add-room-type",   icon: <FaPlus />,     roles: ["ADMIN"] },
            { name: "availableRooms",    href: "/rooms/available", icon: <FaDoorOpen />, roles: ["ADMIN", "RECEPTION"] },
            { name: "housekeepingBoard", href: "/housekeeping",    icon: <FaBroom />,    roles: ["ADMIN", "RECEPTION"] },
            { name: "addTask",           href: "/housekeeping/add",icon: <FaPlus />,     roles: ["ADMIN", "RECEPTION"] },
            { name: "maintenanceIssues", href: "/maintenance",     icon: <FaWrench />,   roles: ["ADMIN", "RECEPTION"] },
            { name: "reportIssue",       href: "/maintenance/add", icon: <FaPlus />,     roles: ["ADMIN", "RECEPTION"] },
            { name: "inventoryMinibar",  href: "/inventory",       icon: <FaCog />,      roles: ["ADMIN", "RECEPTION"] },
        ],
    },
    {
        id: "guestExp",
        label: "Guest Experience",
        icon: <FaStar />,
        roles: ["ADMIN", "RECEPTION"],
        items: [
            { name: "services",          href: "/services",            icon: <FaCog />,        roles: ["ADMIN", "RECEPTION"] },
            { name: "addService",        href: "/add-service",         icon: <FaPlus />,       roles: ["ADMIN"] },
            { name: "serviceRequests",   href: "/service-requests",    icon: <FaTools />,      roles: ["ADMIN", "RECEPTION"] },
            { name: "addServiceRequest", href: "/add-service-request", icon: <FaPlus />,       roles: ["ADMIN", "RECEPTION"] },
            { name: "conciergeRequests", href: "/concierge",           icon: <FaBell />,       roles: ["ADMIN", "RECEPTION"] },
            { name: "loyaltyProgram",    href: "/loyalty",             icon: <FaStar />,       roles: ["ADMIN", "RECEPTION"] },
            { name: "roomCharges",       href: "/pos",                 icon: <FaShoppingCart />, roles: ["ADMIN", "RECEPTION"] },
            { name: "promoCodes",        href: "/vouchers",            icon: <FaTag />,        roles: ["ADMIN"] },
            { name: "emailCampaigns",    href: "/campaigns",           icon: <FaEnvelope />,   roles: ["ADMIN"] },
        ],
    },
    {
        id: "finance",
        label: "Finance",
        icon: <FaMoneyBillWave />,
        roles: ["ADMIN", "RECEPTION"],
        items: [
            { name: "payments",             href: "/payments",      icon: <FaMoneyBillWave />,    roles: ["ADMIN", "RECEPTION"] },
            { name: "addPayment",           href: "/add-payment",   icon: <FaPlus />,             roles: ["ADMIN", "RECEPTION"] },
            { name: "pdfInvoice",           href: "/invoices",      icon: <FaFileInvoiceDollar />,roles: ["ADMIN"] },
            { name: "dailyReconciliation",  href: "/reconciliation",icon: <FaMoneyBillWave />,    roles: ["ADMIN"] },
            { name: "financialDashboard",   href: "/financials",    icon: <FaMoneyBillWave />,    roles: ["ADMIN"] },
        ],
    },
    {
        id: "pricing",
        label: "Pricing & Distribution",
        icon: <FaSlidersH />,
        roles: ["ADMIN"],
        items: [
            { name: "ratePlans",       href: "/rate-plans",        icon: <FaTag />,        roles: ["ADMIN"] },
            { name: "addRatePlan",     href: "/rate-plans/add",    icon: <FaPlus />,       roles: ["ADMIN"] },
            { name: "pricingRules",    href: "/pricing-rules",     icon: <FaSlidersH />,   roles: ["ADMIN"] },
            { name: "pricingCalendar", href: "/pricing-calendar",  icon: <FaCalendarAlt />,roles: ["ADMIN"] },
            { name: "otaChannels",     href: "/channel-manager",   icon: <FaGlobe />,      roles: ["ADMIN"] },
            { name: "revenueOptimizer",href: "/revenue-optimizer", icon: <FaChartBar />,   roles: ["ADMIN"] },
            { name: "paceReport",      href: "/pace-report",       icon: <FaChartBar />,   roles: ["ADMIN"] },
        ],
    },
    {
        id: "analytics",
        label: "Analytics & Reports",
        icon: <FaChartBar />,
        roles: ["ADMIN", "RECEPTION"],
        items: [
            { name: "kpi",             href: "/kpi",               icon: <FaTachometerAlt />, roles: ["ADMIN"] },
            { name: "reports",         href: "/reports",           icon: <FaFileAlt />,       roles: ["ADMIN"] },
            { name: "guestAnalytics",  href: "/guest-analytics",   icon: <FaChartBar />,      roles: ["ADMIN"] },
            { name: "revenueByChannel",href: "/revenue-by-channel",icon: <FaChartBar />,      roles: ["ADMIN"] },
            { name: "bookingTrends",   href: "/booking-trends",    icon: <FaChartBar />,      roles: ["ADMIN"] },
            { name: "repeatGuests",    href: "/repeat-guests",     icon: <FaUsers />,         roles: ["ADMIN"] },
        ],
    },
    {
        id: "aiCenter",
        label: "AI Center",
        icon: <FaRobot />,
        roles: ["ADMIN", "RECEPTION", "USER"],
        items: [
            { name: "luxBotAssistant", href: "/ai-assistant", icon: <FaRobot />,       roles: ["ADMIN", "RECEPTION", "USER"] },
            { name: "knowledgeBase",   href: "/ai-knowledge", icon: <FaBook />,        roles: ["ADMIN"] },
            { name: "aiMonitor",       href: "/ai-monitor",   icon: <FaHeartbeat />,   roles: ["ADMIN"] },
            { name: "aiCompanyAudit",  href: "/ai-audit",     icon: <FaCheckCircle />, roles: ["ADMIN"] },
            { name: "aiEvaluation",    href: "/ai-eval",      icon: <FaFlask />,       roles: ["ADMIN"] },
        ],
    },
    {
        id: "admin",
        label: "Admin & Settings",
        icon: <FaCog />,
        roles: ["ADMIN"],
        items: [
            { name: "hotel",         href: "/hotel",          icon: <FaHotel />,      roles: ["ADMIN"] },
            { name: "addHotel",      href: "/add-hotel",      icon: <FaPlus />,       roles: ["ADMIN"] },
            { name: "hotelSettings", href: "/hotel-settings", icon: <FaTools />,      roles: ["ADMIN"] },
            { name: "employees",     href: "/employees",      icon: <FaUserTie />,    roles: ["ADMIN"] },
            { name: "addEmployee",   href: "/add-employees",  icon: <FaUserPlus />,   roles: ["ADMIN"] },
            { name: "staffSchedule", href: "/staff",          icon: <FaCalendarAlt />,roles: ["ADMIN"] },
            { name: "chainDashboard",href: "/chain",          icon: <FaChartBar />,   roles: ["ADMIN"] },
            { name: "webhooks",      href: "/webhooks",       icon: <FaDatabase />,   roles: ["ADMIN"] },
            { name: "auditLog",      href: "/audit-log",      icon: <FaFileAlt />,    roles: ["ADMIN"] },
            { name: "imageUpload",   href: "/image-upload",   icon: <FaImage />,      roles: ["ADMIN"] },
        ],
    },
];

/* ── account links (bottom, before logout) ───────────────────────────── */
const ACCOUNT_LINKS: NavLink[] = [
    { name: "myProfile", href: "/profile",         icon: <FaUserTie />,      roles: ["USER", "RECEPTION", "ADMIN"] },
    { name: "myBookings", href: "/guest-functions", icon: <FaClipboardList />,roles: ["USER"] },
];

/* ═══════════════════════════════════════════════════════════════════════ */

export default function Sidebar() {
    const pathname   = usePathname();
    const router     = useRouter();
    const { mobileOpen, closeMobile } = useSidebar();
    const { t }      = useTranslation();

    const [ready, setReady]         = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole]   = useState<string | null>(null);
    const [isDemo, setIsDemo]       = useState(false);
    const [compact, setCompact]     = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    /* auth */
    useEffect(() => {
        if (typeof window === "undefined") return;
        const token = localStorage.getItem("token");
        if (!token || isTokenExpired(token)) {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            setIsLoggedIn(false);
            setUserRole(null);
            setReady(true);
            return;
        }
        let role = localStorage.getItem("role");
        if (!role) {
            role = getRoleFromToken(token) ?? null;
            if (role) localStorage.setItem("role", role);
        }
        if (role && ["ADMIN", "RECEPTION", "USER"].includes(role)) {
            setIsLoggedIn(true);
            setUserRole(role);
        } else {
            setIsLoggedIn(false);
            setUserRole(null);
        }
        setIsDemo(isDemoFromToken(token));
        setReady(true);
    }, [pathname]);

    /* auto-open the group containing the active page */
    useEffect(() => {
        const activeGroup = NAV_GROUPS.find(g =>
            g.items.some(item =>
                pathname === item.href || pathname?.startsWith(item.href + "/")
            )
        );
        if (activeGroup) {
            setOpenGroups(prev => ({ ...prev, [activeGroup.id]: true }));
        }
    }, [pathname]);

    /* close mobile on navigate */
    useEffect(() => { closeMobile(); }, [pathname, closeMobile]);

    /* sync CSS var for layout offset */
    useEffect(() => {
        if (typeof document === "undefined") return;
        const width = (ready && isLoggedIn) ? (compact ? "76px" : "240px") : "0px";
        document.body.style.setProperty("--sidebar-width", width);
        return () => { document.body.style.removeProperty("--sidebar-width"); };
    }, [compact, ready, isLoggedIn]);

    /* filter helpers */
    const hasRole = (roles: string[]) => !!userRole && roles.includes(userRole);

    const visibleTopLinks = useMemo(
        () => TOP_LINKS.filter(l => hasRole(l.roles)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [userRole]
    );
    const visibleGroups = useMemo(
        () => NAV_GROUPS.filter(g => hasRole(g.roles))
                        .map(g => ({
                            ...g,
                            items: g.items.filter(i => hasRole(i.roles)),
                        }))
                        .filter(g => g.items.length > 0),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [userRole]
    );
    const visibleAccountLinks = useMemo(
        () => ACCOUNT_LINKS.filter(l => hasRole(l.roles)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [userRole]
    );

    function toggleGroup(id: string) {
        setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        document.cookie = "token=; path=/; max-age=0";
        document.cookie = "role=; path=/; max-age=0";
        router.replace("/login");
    }

    function renderLink(item: NavLink) {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
            <li key={item.href}>
                <Link href={item.href} prefetch={false} className={styles.link}
                      aria-current={isActive ? "page" : undefined}>
                    <div className={`${styles.item} ${isActive ? styles.active : ""}`}>
                        <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                        <span className={styles.label}>{t(item.name)}</span>
                    </div>
                </Link>
            </li>
        );
    }

    if (!ready || !isLoggedIn || !userRole) return null;

    return (
        <>
            {mobileOpen && (
                <div className={styles.overlay} onClick={closeMobile} aria-hidden="true" />
            )}

            <nav
                className={`${styles.container} ${compact ? styles.compact : ""} ${mobileOpen ? styles.mobileOpen : ""}`}
                aria-label="Primary"
            >
                {/* ── Top bar ── */}
                <div className={styles.top}>
                    <div className={styles.brand} aria-label="Hotel Booking">
                        <span className={styles.brandIcon} aria-hidden="true"><FaHotel /></span>
                        <span className={styles.brandText}>Hotel Booking</span>
                        <span className={styles.rolePill}>{userRole}</span>
                    </div>
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => setCompact(v => !v)}
                        aria-label={compact ? t("expandSidebar") : t("collapseSidebar")}
                        title={compact ? t("expandSidebar") : t("collapseSidebar")}
                    >
                        {compact ? <FaChevronRight /> : <FaChevronLeft />}
                    </button>
                </div>

                <div className={styles.divider} />

                {/* ── Demo mode banner ── */}
                {isDemo && !compact && (
                    <div className={styles.demoBanner}>
                        DEMO MODE — read-only sandbox
                    </div>
                )}

                {/* ── Scroll list ── */}
                <ul className={styles.list}>

                    {/* Standalone top links: Dashboard + Notifications */}
                    {visibleTopLinks.map(item => renderLink(item))}

                    {visibleTopLinks.length > 0 && <li><div className={styles.groupDivider} /></li>}

                    {/* Collapsible groups */}
                    {visibleGroups.map(group => {
                        const isOpen = !!openGroups[group.id];
                        const hasActive = group.items.some(
                            item => pathname === item.href || pathname?.startsWith(item.href + "/")
                        );

                        return (
                            <li key={group.id}>
                                {/* Group header */}
                                <button
                                    type="button"
                                    className={`${styles.groupHeader} ${hasActive ? styles.groupHeaderActive : ""}`}
                                    onClick={() => toggleGroup(group.id)}
                                    aria-expanded={isOpen ? "true" : "false"}
                                    aria-controls={`sidebar-group-${group.id}`}
                                >
                                    <span className={styles.groupIcon} aria-hidden="true">
                                        {group.icon}
                                    </span>
                                    <span className={styles.groupLabel}>{group.label}</span>
                                    <FaChevronRight
                                        aria-hidden="true"
                                        className={`${styles.groupChevron} ${isOpen ? styles.groupChevronOpen : ""}`}
                                    />
                                </button>

                                {/* Collapsible items */}
                                <div
                                    id={`sidebar-group-${group.id}`}
                                    className={`${styles.groupItems} ${isOpen ? styles.groupItemsOpen : ""}`}
                                >
                                    <ul className={styles.groupItemsInner}>
                                        {group.items.map(item => {
                                            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                                            return (
                                                <li key={item.href} className={styles.groupItemRow}>
                                                    <Link href={item.href} prefetch={false}
                                                          className={styles.link}
                                                          aria-current={isActive ? "page" : undefined}>
                                                        <div className={`${styles.item} ${styles.itemIndented} ${isActive ? styles.active : ""}`}>
                                                            <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                                                            <span className={styles.label}>{t(item.name)}</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </li>
                        );
                    })}

                    {/* Account section (profile, my bookings) */}
                    {visibleAccountLinks.length > 0 && (
                        <>
                            <li><div className={styles.groupDivider} /></li>
                            {visibleAccountLinks.map(item => renderLink(item))}
                        </>
                    )}
                </ul>

                {/* ── Bottom bar ── */}
                <div className={styles.bottom}>
                    <div className={styles.themeRow}>
                        <ThemeToggle compact={compact} />
                    </div>
                    <button type="button" className={styles.logoutBtn} onClick={logout}>
                        <FaSignOutAlt aria-hidden="true" />
                        <span className={styles.label}>{t("logout")}</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
