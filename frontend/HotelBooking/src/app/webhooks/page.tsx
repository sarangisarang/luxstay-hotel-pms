"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/Webhooks.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Subscription = {
    id: string; name: string; targetUrl: string; events: string; secret?: string; active: boolean; createdAt: string;
};
type Delivery = {
    id: string; subscriptionId: string; event: string; statusCode: number; error?: string; deliveredAt: string;
};

const ALL_EVENTS = ["booking.created","payment.completed","guest.checkedin","booking.cancelled","ping"];

function StatusBadge({ code }: { code: number }) {
    const ok = code >= 200 && code < 300;
    return (
        <span className={`badge ${ok ? "badge-success" : code === 0 ? "badge-neutral" : "badge-danger"}`}>
            {code === 0 ? "failed" : code}
        </span>
    );
}

export default function WebhooksPage() {
  const { t } = useTranslation();
    const [subs, setSubs]         = useState<Subscription[]>([]);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading]   = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", targetUrl: "", secret: "", events: [] as string[] });
    const [pingMsg, setPingMsg]   = useState("");

    const load = () => {
        setLoading(true);
        Promise.all([api.get("/api/webhooks"), api.get("/api/webhooks/deliveries")])
            .then(([s, d]) => { setSubs(s.data); setDeliveries(d.data); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        await api.post("/api/webhooks", { ...form, events: form.events.join(",") });
        setShowForm(false);
        setForm({ name: "", targetUrl: "", secret: "", events: [] });
        load();
    }

    async function toggle(sub: Subscription) {
        await api.patch(`/api/webhooks/${sub.id}`, { ...sub, active: !sub.active });
        load();
    }

    async function deleteSub(id: string) {
        if (!confirm("Delete this webhook?")) return;
        await api.delete(`/api/webhooks/${id}`);
        load();
    }

    async function testPing() {
        await api.post("/api/webhooks/test-ping");
        setPingMsg("Ping fired to all active subscribers!");
        setTimeout(() => { setPingMsg(""); load(); }, 2000);
    }

    function toggleEvent(ev: string) {
        setForm(f => ({
            ...f,
            events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
        }));
    }

    return (
        <div className="page-wrapper fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('webhookManager')}</h1>
                    <p className="page-subtitle">{t('webhookSubtitle')}</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary btn-sm" onClick={testPing}>🏓 {t('testPing')}</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
                        {showForm ? t('cancel') : `+ ${t('addWebhook')}`}
                    </button>
                </div>
            </div>

            {pingMsg && <div className="feedback-success">{pingMsg}</div>}

            {/* Create form */}
            {showForm && (
                <div className={s.formCard}>
                    <form onSubmit={submit}>
                        <div className={s.formRow}>
                            <div className="form-field">
                                <label className="form-label">{t('name')}</label>
                                <input className="form-input" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="My integration" required />
                            </div>
                            <div className="form-field">
                                <label className="form-label">{t('targetUrl')}</label>
                                <input className="form-input" value={form.targetUrl} type="url"
                                    onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))}
                                    placeholder="https://example.com/hook" required />
                            </div>
                            <div className="form-field">
                                <label className="form-label">{t('secretOptional')}</label>
                                <input className="form-input" value={form.secret}
                                    onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
                                    placeholder="HMAC signing secret" />
                            </div>
                        </div>
                        <div className="form-field">
                            <label className="form-label">{t('subscribeToEvents')}</label>
                            <div className={s.eventGrid}>
                                {ALL_EVENTS.map(ev => (
                                    <label key={ev} className={s.eventChip}>
                                        <input type="checkbox" checked={form.events.includes(ev)}
                                            onChange={() => toggleEvent(ev)} />
                                        {ev}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary">{t('saveWebhook')}</button>
                    </form>
                </div>
            )}

            {/* Subscriptions list */}
            <div className={`data-card ${s.mb24}`}>
                <div className="data-card-header">
                    <span className="data-card-title">{t('subscriptions')} ({subs.length})</span>
                </div>
                {loading ? (
                    <div className="state-container"><div className="spinner" /></div>
                ) : subs.length === 0 ? (
                    <div className="state-container">
                        <div className="state-icon">🔗</div>
                        <p className="state-title">{t('noWebhooksYet')}</p>
                        <p className="state-sub">{t('noWebhooksDesc')}</p>
                    </div>
                ) : (
                    <table className="ui-table">
                        <thead>
                            <tr><th>{t('name')}</th><th>{t('targetUrl')}</th><th>Events</th><th>{t('status')}</th><th>{t('created')}</th><th>{t('actions')}</th></tr>
                        </thead>
                        <tbody>
                            {subs.map(sub => (
                                <tr key={sub.id}>
                                    <td><span className="cell-name">{sub.name}</span></td>
                                    <td><span className={s.url}>{sub.targetUrl}</span></td>
                                    <td>
                                        <div className={s.eventTags}>
                                            {sub.events.split(",").map(ev => (
                                                <span key={ev} className={s.eventTag}>{ev}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${sub.active ? "badge-success" : "badge-neutral"}`}>
                                            {sub.active ? t('active') : t('paused')}
                                        </span>
                                    </td>
                                    <td className="cell-muted">{new Date(sub.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className="cell-actions">
                                            <button className="btn btn-secondary btn-sm" onClick={() => toggle(sub)}>
                                                {sub.active ? t('pause') : t('resume')}
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => deleteSub(sub.id)}>{t('delete')}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Delivery log */}
            <div className="data-card">
                <div className="data-card-header">
                    <span className="data-card-title">Recent Deliveries (last 50)</span>
                    <button className="btn btn-secondary btn-sm" onClick={load}>{t('refresh')}</button>
                </div>
                {deliveries.length === 0 ? (
                    <div className="state-container">
                        <p className="state-sub">No deliveries yet — fire a test ping or wait for an event.</p>
                    </div>
                ) : (
                    <table className="ui-table">
                        <thead>
                            <tr><th>Event</th><th>{t('status')}</th><th>Error</th><th>Delivered</th></tr>
                        </thead>
                        <tbody>
                            {deliveries.map(d => (
                                <tr key={d.id}>
                                    <td><span className={s.eventTag}>{d.event}</span></td>
                                    <td><StatusBadge code={d.statusCode} /></td>
                                    <td className="cell-muted">{d.error ?? "—"}</td>
                                    <td className="cell-muted">{new Date(d.deliveredAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
