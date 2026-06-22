"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/components/lib/axiosConfig";
import { UserPlus, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface Hotel { id: string; name: string; }

type EmployeePayload = {
  firstName:   string;
  lastName:    string;
  positions:   string;
  email:       string;
  phone:       string;
  salary:      string;
  hotelId:     string;
  dateOfBirth: string;
  hireDate:    string;
};

const EMPTY: EmployeePayload = {
  firstName: "", lastName: "", positions: "", email: "",
  phone: "", salary: "", hotelId: "", dateOfBirth: "", hireDate: "",
};

const POSITIONS = ["MANAGER", "RECEPTIONIST", "HOUSEKEEPING", "MAINTENANCE", "SECURITY"];

export default function AddEmployee() {
  const { t } = useTranslation();
  const router = useRouter();
  const [form,    setForm]    = useState<EmployeePayload>(EMPTY);
  const [hotels,  setHotels]  = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/api/hotels")
      .then(r => setHotels(Array.isArray(r.data) ? r.data : (r.data?.content ?? [])))
      .catch((e) => console.error('Failed to load dropdown data:', e));
  }, []);

  function set(field: keyof EmployeePayload) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post("/api/staff", { ...form, salary: parseFloat(form.salary) });
      setSuccess(true);
      setTimeout(() => router.push("/employees"), 1400);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      setError(ax?.response?.data?.message ?? ax?.response?.data?.error ?? ax?.message ?? "Failed to add employee.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-in form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('addEmployee', 'Add Employee')}</h1>
          <p className="page-subtitle">{t('addEmployeeSubtitle', 'Register a new staff member')}</p>
        </div>
        <Link href="/employees" className="btn btn-secondary">
          <ArrowLeft size={14} /> Back to Employees
        </Link>
      </div>

      <div className="form-card">
        <div className="form-header">
          <div className="avatar-sm"><UserPlus size={14} /></div>
          <div className="form-header-text">
            <p className="form-heading">Staff Information</p>
            <p className="form-subheading">All fields are required</p>
          </div>
        </div>

        {success && (
          <div className="feedback-success">
            <CheckCircle size={15} /> Employee added successfully! Redirecting…
          </div>
        )}
        {error && (
          <div className="feedback-error">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="e-first">First Name</label>
              <input id="e-first" className="form-input" type="text" placeholder="John"
                value={form.firstName} onChange={set("firstName")} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="e-last">Last Name</label>
              <input id="e-last" className="form-input" type="text" placeholder="Doe"
                value={form.lastName} onChange={set("lastName")} required />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="e-pos">Position</label>
              <select id="e-pos" className="form-select" value={form.positions} onChange={set("positions")} required>
                <option value="">Select position…</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="e-hotel">{t('hotel')}</label>
              <select id="e-hotel" className="form-select" value={form.hotelId} onChange={set("hotelId")} required>
                <option value="">Select hotel…</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="e-email">Email Address</label>
            <input id="e-email" className="form-input" type="email" placeholder="john@hotel.com"
              value={form.email} onChange={set("email")} required />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="e-phone">{t('phone')}</label>
              <input id="e-phone" className="form-input" type="tel" placeholder="+1 555 000 0000"
                value={form.phone} onChange={set("phone")} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="e-salary">Salary (USD)</label>
              <input id="e-salary" className="form-input" type="number" min="0" step="0.01" placeholder="50000"
                value={form.salary} onChange={set("salary")} required />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="e-dob">Date of Birth</label>
              <input id="e-dob" className="form-input" type="date"
                value={form.dateOfBirth} onChange={set("dateOfBirth")} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="e-hire">Hire Date</label>
              <input id="e-hire" className="form-input" type="date"
                value={form.hireDate} onChange={set("hireDate")} required />
            </div>
          </div>

          <button type="submit" className="form-button" disabled={loading || success}>
            {loading ? "Adding employee…" : "Add Employee"}
          </button>
        </form>
      </div>
    </div>
  );
}
