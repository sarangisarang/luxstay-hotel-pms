"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { Search, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface Staff {
  id:          string;
  firstName:   string;
  lastName:    string;
  positions:   string;
  email:       string;
  phone:       string;
  salary:      number;
  hotelName:   string;
  dateOfBirth: string;
}

function calcAge(dob: string): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSalary(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function initials(f: string, l: string) {
  return `${f?.[0] ?? ""}${l?.[0] ?? ""}`.toUpperCase() || "?";
}

const POSITION_COLOR: Record<string, string> = {
  MANAGER:      "badge-info",
  RECEPTIONIST: "badge-success",
  HOUSEKEEPING: "badge-neutral",
  MAINTENANCE:  "badge-warn",
  SECURITY:     "badge-neutral",
};

export default function EmployeeListPage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Staff[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    let alive = true;
    api.get("/api/staff")
      .then(r => { if (alive) setEmployees(Array.isArray(r.data) ? r.data : (r.data?.content ?? [])); })
      .catch(e => { if (alive) setError(e?.message ?? "Failed to load staff"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? employees.filter(e =>
      `${e.firstName} ${e.lastName} ${e.positions} ${e.email} ${e.hotelName}`.toLowerCase().includes(q)
    ) : employees;
  }, [employees, search]);

  if (loading) return (
    <div className="state-container">
      <div className="spinner" />
      <p className="state-title">{t('loadingStaff')}</p>
    </div>
  );

  if (error) return (
    <div className="state-container">
      <div className="state-icon">⚠️</div>
      <p className="state-title">{t('error', 'Error')}</p>
      <p className="state-sub">{error}</p>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('employees')}</h1>
          <p className="page-subtitle">{employees.length} {t('staffMembers', 'staff members')}</p>
        </div>
        <div className="page-actions">
          <Link href="/add-employees" className="btn btn-primary">
            <UserPlus size={15} /> {t('addEmployee')}
          </Link>
        </div>
      </div>

      <div className="data-card">
        <div className="data-card-header">
          <span className="data-card-title">{t('allStaff')}</span>
          <div className="search-bar">
            <Search size={14} className="search-icon" />
            <input
              className="search-input"
              placeholder={t('searchStaff')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="state-container">
            <div className="state-icon">👔</div>
            <p className="state-title">{search ? t('noStaffMatch') : t('noEmployeesYet')}</p>
            <p className="state-sub">{search ? t('tryDifferentQuery', 'Try a different query') : t('addFirstEmployee', 'Add your first employee to get started')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>{t('employee')}</th>
                  <th>{t('position')}</th>
                  <th>{t('phone')}</th>
                  <th>{t('hotel')}</th>
                  <th>{t('salary')}</th>
                  <th>{t('dateOfBirth')}</th>
                  <th>{t('age')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="cell-with-avatar">
                        <div className="avatar-sm">{initials(s.firstName, s.lastName)}</div>
                        <div>
                          <div className="cell-name">{s.firstName} {s.lastName}</div>
                          <div className="cell-sub">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${POSITION_COLOR[s.positions?.toUpperCase()] ?? "badge-neutral"}`}>
                        {s.positions || "—"}
                      </span>
                    </td>
                    <td className="cell-muted">{s.phone || "—"}</td>
                    <td>{s.hotelName || "—"}</td>
                    <td className="cell-mono">{fmtSalary(s.salary)}</td>
                    <td className="cell-muted">{fmtDate(s.dateOfBirth)}</td>
                    <td>{calcAge(s.dateOfBirth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
