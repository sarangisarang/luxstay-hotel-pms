"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardAnalytics from "@/components/tables/DashboardAnalytics";
import s from "@/styles/Admin.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";
import {
    Hotel, Users, BedDouble, CalendarCheck, CreditCard,
    Star, Wrench, LayoutDashboard, FileText, UserCog,
    ChevronRight, Shield, Package, ClipboardList, BarChart3,
    Globe, Bell, Calendar, Database, Link2,
} from "lucide-react";

const QUICK_LINKS = [
    { href: "/bookings",         icon: <CalendarCheck size={20} />, labelKey: "adminBookings",        descKey: "adminBookingsDesc" },
    { href: "/guests",           icon: <Users size={20} />,         labelKey: "adminGuests",          descKey: "adminGuestsDesc" },
    { href: "/rooms",            icon: <BedDouble size={20} />,     labelKey: "adminRooms",           descKey: "adminRoomsDesc" },
    { href: "/hotel",            icon: <Hotel size={20} />,         labelKey: "adminHotels",          descKey: "adminHotelsDesc" },
    { href: "/payments",         icon: <CreditCard size={20} />,    labelKey: "adminPayments",        descKey: "adminPaymentsDesc" },
    { href: "/invoices",         icon: <FileText size={20} />,      labelKey: "adminInvoices",        descKey: "adminInvoicesDesc" },
    { href: "/employees",        icon: <UserCog size={20} />,       labelKey: "adminStaff",           descKey: "adminStaffDesc" },
    { href: "/room-types",       icon: <BedDouble size={20} />,     labelKey: "adminRoomTypes",       descKey: "adminRoomTypesDesc" },
    { href: "/services",         icon: <Wrench size={20} />,        labelKey: "adminServices",        descKey: "adminServicesDesc" },
    { href: "/feedback",         icon: <Star size={20} />,          labelKey: "adminFeedback",        descKey: "adminFeedbackDesc" },
    { href: "/reports",          icon: <LayoutDashboard size={20} />, labelKey: "adminReports",       descKey: "adminReportsDesc" },
    { href: "/kpi",              icon: <BarChart3 size={20} />,     labelKey: "adminKpi",             descKey: "adminKpiDesc" },
    { href: "/chain",            icon: <Globe size={20} />,         labelKey: "adminChain",           descKey: "adminChainDesc" },
    { href: "/inventory",        icon: <Package size={20} />,       labelKey: "adminInventory",       descKey: "adminInventoryDesc" },
    { href: "/pricing-calendar", icon: <Calendar size={20} />,      labelKey: "adminRateCalendar",    descKey: "adminRateCalendarDesc" },
    { href: "/audit-log",        icon: <ClipboardList size={20} />, labelKey: "adminAuditLog",        descKey: "adminAuditLogDesc" },
    { href: "/webhooks",         icon: <Link2 size={20} />,         labelKey: "adminWebhooks",        descKey: "adminWebhooksDesc" },
    { href: "/notifications",    icon: <Bell size={20} />,          labelKey: "adminNotifications",   descKey: "adminNotificationsDesc" },
    { href: "/channel-manager",  icon: <Database size={20} />,      labelKey: "adminChannels",        descKey: "adminChannelsDesc" },
];

export default function AdminPage() {
  const { t } = useTranslation();
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem("role");
        if (role !== "ADMIN") { router.push("/dashboard"); return; }
        setChecked(true);
    }, [router]);

    if (!checked) return null;

    return (
        <div className={s.page}>
            {/* Page header */}
            <div className={s.pageHeader}>
                <div className={s.headerIcon}>
                    <Shield size={22} />
                </div>
                <div>
                    <h1 className={s.pageTitle}>{t('adminPanel')}</h1>
                    <p className={s.pageSubtitle}>{t('adminSubtitle')}</p>
                </div>
            </div>

            {/* Quick-access grid */}
            <div className={s.grid}>
                {QUICK_LINKS.map(link => (
                    <Link key={link.href} href={link.href} className={s.linkCard}>
                        <div className={s.linkCardInner}>
                            <div className={s.linkIconBox}>{link.icon}</div>
                            <div>
                                <p className={s.linkLabel}>{t(link.labelKey)}</p>
                                <p className={s.linkDesc}>{t(link.descKey)}</p>
                            </div>
                        </div>
                        <ChevronRight size={15} className={s.chevron} />
                    </Link>
                ))}
            </div>

            {/* Full analytics dashboard */}
            <div className={s.analyticsSection}>
                <p className={s.analyticsTitle}>{t('liveDashboard')}</p>
                <DashboardAnalytics />
            </div>
        </div>
    );
}
