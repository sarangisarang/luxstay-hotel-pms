"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, CalendarCheck, BedDouble, Euro, BarChart3, Download } from "lucide-react";
import styles from "@/styles/Reports.module.css";
import api from "@/components/lib/axiosConfig";
import AiInsightCard from "@/components/AiInsightCard";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Stats = {
  totalBookings: number;
  activeBookings: number;
  totalGuests: number;
  occupiedRooms: number;
  freeRooms: number;
  revenueToday: number;
  revenueMonth: number;
};

type MonthlyRow = { month: string; revenue: number };
type StatusRow  = { status: string; count: number };

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED:   "#4f46e5",
  CHECKED_IN:  "#0891b2",
  CHECKED_OUT: "#d97706",
  COMPLETED:   "#16a34a",
  CANCELLED:   "#dc2626",
  PENDING:     "#9333ea",
};

const CHART_COLORS = ["#4f46e5","#0891b2","#16a34a","#d97706","#dc2626","#9333ea","#f59e0b"];

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const fmtEur = (v: number) =>
  v >= 1000 ? `€${(v / 1000).toFixed(1)}k` : `€${v.toFixed(0)}`;

export default function ReportsPage() {
  const { t } = useTranslation();
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [monthly,  setMonthly]  = useState<MonthlyRow[]>([]);
  const [byStatus, setByStatus] = useState<StatusRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get("/api/admin/stats").then(r => r.data),
      api.get("/api/admin/monthly-revenue").then(r => r.data),
      api.get("/api/admin/booking-status-summary").then(r => r.data),
    ])
      .then(([s, m, bs]) => {
        setStats(s);
        setMonthly(m.map((row: MonthlyRow) => ({
          ...row,
          revenue: Number(row.revenue),
        })));
        const rows: StatusRow[] = Object.entries(bs as Record<string, number>)
          .map(([status, count]) => ({ status, count }));
        setByStatus(rows);
      })
      .catch(() => setError(t('couldNotLoadReport')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loadingState}>{t('loadingReports')}</div>;
  if (error)   return <div className={styles.errorState}>{error}</div>;

  const occupancy = stats
    ? Math.round((stats.occupiedRooms / Math.max(stats.occupiedRooms + stats.freeRooms, 1)) * 100)
    : 0;

  const occupancyData = [
    { name: "Occupied", value: stats?.occupiedRooms ?? 0 },
    { name: "Free",     value: stats?.freeRooms ?? 0 },
  ];

  return (
    <div className={styles.page}>
      <AiInsightCard endpoint="/api/ai/insights/revenue" title={t('aiRevenuePerformanceAnalysis')} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitle}>
            <BarChart3 size={26} color="#4f46e5" />
            <h1>{t('reportsAnalytics', 'Reports & Analytics')}</h1>
          </div>
          <div className={styles.exportButtons}>
            <button type="button" className={styles.exportBtn}
              onClick={() => exportCsv("monthly-revenue.csv", monthly as unknown as Record<string, unknown>[])}>
              <Download size={14} /> {t('revenueCSV')}
            </button>
            <button type="button" className={styles.exportBtn}
              onClick={() => exportCsv("booking-status.csv", byStatus as unknown as Record<string, unknown>[])}>
              <Download size={14} /> {t('statusCSV')}
            </button>
          </div>
        </div>
        <p className={styles.headerSubtitle}>{t('reportsSubtitle', 'Live overview of hotel performance, revenue, and occupancy')}</p>
      </div>

      {/* KPI cards */}
      {stats && (
        <div className={styles.kpiGrid}>
          <KpiCard icon={<CalendarCheck size={20}/>} label={t('totalBookings')}       value={stats.totalBookings}  color="#4f46e5" />
          <KpiCard icon={<CalendarCheck size={20}/>} label={t('activeBookingsCount')} value={stats.activeBookings} color="#0891b2" />
          <KpiCard icon={<Users size={20}/>}         label={t('totalGuests')}          value={stats.totalGuests}    color="#9333ea" />
          <KpiCard icon={<BedDouble size={20}/>}     label={t('occupiedRooms')}        value={`${stats.occupiedRooms} / ${stats.occupiedRooms + stats.freeRooms}`} color="#d97706" />
          <KpiCard icon={<TrendingUp size={20}/>}    label={t('occupancyRate')}        value={`${occupancy}%`}      color="#16a34a" />
          <KpiCard icon={<Euro size={20}/>}          label={t('revenueToday')}         value={`€${Number(stats.revenueToday).toFixed(2)}`}  color="#f59e0b" />
          <KpiCard icon={<TrendingUp size={20}/>}    label={t('revenueMonth')}         value={`€${Number(stats.revenueMonth).toFixed(2)}`}  color="#ef4444" />
        </div>
      )}

      <div className={styles.chartsGrid}>

        {/* Monthly Revenue — Area Chart */}
        <div className={`${styles.card} ${styles.spanFull}`}>
          <h2 className={styles.sectionTitle}>{t('monthlyRevenue')}</h2>
          {monthly.every(m => Number(m.revenue) === 0) ? (
            <p className={styles.noData}>{t('noResults')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={m => m.split(" ")[0]} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtEur} />
                <Tooltip formatter={(v) => [`€${Number(v).toFixed(2)}`, t('revenueLabel')]} />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2}
                  fill="url(#revenueGrad)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bookings by Status — Bar Chart */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{t('bookingsByStatus')}</h2>
          {byStatus.length === 0 ? (
            <p className={styles.noData}>{t('noResults')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byStatus} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byStatus.map((entry, i) => (
                    <Cell key={entry.status} fill={STATUS_COLOR[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Occupancy Donut */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{t('roomOccupancy')}</h2>
          <div className={styles.occupancyWrap}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={occupancyData} dataKey="value" innerRadius={55} outerRadius={80}
                  paddingAngle={3} startAngle={90} endAngle={-270}>
                  <Cell fill="#4f46e5" />
                  <Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip formatter={(v, name) => [`${v} rooms`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.occupancyStats}>
              <div className={styles.occupancyRate}>{occupancy}%</div>
              <div className={styles.occupancyLabel}>{t('occupancyRate')}</div>
              <div className={styles.legendList}>
                <LegendDot color="#4f46e5" label={`${t('occupiedLabel')}: ${stats?.occupiedRooms ?? 0}`} />
                <LegendDot color="#e2e8f0" label={`${t('freeLabel')}: ${stats?.freeRooms ?? 0}`} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

const DOT_CLS: Record<string, string> = {
  "#4f46e5": styles.dotIndigo,
  "#e2e8f0": styles.dotGray,
};

const KPI_ICON_CLS: Record<string, string> = {
  "#4f46e5": styles.kpiIconIndigo,
  "#0891b2": styles.kpiIconCyan,
  "#9333ea": styles.kpiIconPurple,
  "#d97706": styles.kpiIconAmber,
  "#16a34a": styles.kpiIconGreen,
  "#f59e0b": styles.kpiIconYellow,
  "#ef4444": styles.kpiIconRed,
};

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className={styles.legendDot}>
      <span className={`${styles.dot} ${DOT_CLS[color] ?? styles.dotGray}`} />
      {label}
    </div>
  );
}

function KpiCard({ icon, label, value, color }:
  { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiHeader}>
        <div className={`${styles.kpiIcon} ${KPI_ICON_CLS[color] ?? styles.kpiIconIndigo}`}>
          {icon}
        </div>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <p className={styles.kpiValue}>{value}</p>
    </div>
  );
}
