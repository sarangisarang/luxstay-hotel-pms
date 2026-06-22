"use client";

import React, { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import { Activity, Brain, Users, Zap, RefreshCw } from "lucide-react";
import s from "@/styles/AiMonitor.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type AiStats = {
  totalCalls: number;
  claudeCalls: number;
  ragCalls: number;
  handoffs: number;
  avgLatencyMs: number | null;
};

type LogEntry = {
  id: string;
  endpoint: string;
  sessionId: string;
  userMessage: string;
  aiResponse: string;
  usedClaude: boolean;
  usedRag: boolean;
  ragHits: number;
  latencyMs: number;
  retryCount: number;
  handoffTriggered: boolean;
  confidenceLevel: string;
  createdAt: string;
};

const CONF_CLS: Record<string, string> = {
  HIGH:   s.confHigh,
  MEDIUM: s.confMedium,
  LOW:    s.confLow,
};

export default function AiMonitorPage() {
  const { t } = useTranslation();
  const [stats, setStats]       = useState<AiStats | null>(null);
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [st, l] = await Promise.all([
        api.get("/api/ai/monitor/stats"),
        api.get("/api/ai/monitor/recent"),
      ]);
      setStats(st.data);
      setLogs(l.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className={s.loadMsg}>{t('loadingMonitor', 'Loading monitor…')}</div>;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Activity size={24} color="#4f46e5" />
          <div>
            <h1 className={s.title}>{t('aiMonitor', 'AI Monitor')}</h1>
            <p className={s.sub}>{t('aiMonitorSub', 'Live AI call statistics and logs')}</p>
          </div>
        </div>
        <button type="button" className={s.btnRefresh} onClick={load}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {stats && (
        <div className={s.statsGrid}>
          <StatCard icon={<Brain size={18} />}    label="Total Calls"  value={stats.totalCalls}   iconCls={s.iconIndigo} />
          <StatCard icon={<Zap size={18} />}      label="Claude Calls" value={stats.claudeCalls}  iconCls={s.iconPurple} />
          <StatCard icon={<Brain size={18} />}    label="RAG Enhanced" value={stats.ragCalls}     iconCls={s.iconCyan} />
          <StatCard icon={<Users size={18} />}    label="Handoffs"     value={stats.handoffs}     iconCls={s.iconAmber} />
          <StatCard icon={<Activity size={18} />} label="Avg Latency"
            value={stats.avgLatencyMs ? `${Math.round(stats.avgLatencyMs)}ms` : "—"} iconCls={s.iconGreen} />
        </div>
      )}

      <div className={s.tableCard}>
        <div className={s.tableCardTitle}>Recent AI Calls ({logs.length})</div>
        <div className={s.tableScroll}>
          <table className={s.logTable}>
            <thead className={s.tHead}>
              <tr>
                {["Time", "Endpoint", "Claude", "RAG", "Latency", "Confidence", "Handoff", "Message"].map(h => (
                  <th key={h} className={s.tTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={8} className={s.tdEmpty}>{t('noCallsLogged', 'No calls logged yet.')}</td></tr>
              )}
              {logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className={`${s.tRow} ${expanded === log.id ? s.tRowExpanded : ""}`}>
                    <td className={`${s.tTd} ${s.tdTime}`}>{new Date(log.createdAt).toLocaleTimeString()}</td>
                    <td className={`${s.tTd} ${s.tdEndpoint}`}>{log.endpoint}</td>
                    <td className={s.tTd}>
                      <span className={log.usedClaude ? s.hitYes : s.hitNo}>
                        {log.usedClaude ? "✓" : "—"}
                      </span>
                    </td>
                    <td className={s.tTd}>
                      {log.usedRag
                        ? <span className={s.ragHits}>{log.ragHits} hits</span>
                        : <span className={s.ragNone}>—</span>}
                    </td>
                    <td className={s.tTd}>{log.latencyMs}ms</td>
                    <td className={s.tTd}>
                      <span className={CONF_CLS[log.confidenceLevel] ?? s.confDefault}>
                        {log.confidenceLevel}
                      </span>
                    </td>
                    <td className={s.tTd}>
                      {log.handoffTriggered ? <span className={s.handoffYes}>YES</span> : "—"}
                    </td>
                    <td className={`${s.tTd} ${s.tdMsg}`}>{log.userMessage}</td>
                  </tr>
                  {expanded === log.id && (
                    <tr>
                      <td colSpan={8} className={s.expandTd}>
                        <div className={s.expandGrid}>
                          <div>
                            <div className={s.expandLabel}>User Message</div>
                            <div className={s.expandUserMsg}>{log.userMessage}</div>
                          </div>
                          <div>
                            <div className={s.expandLabel}>AI Response</div>
                            <div className={s.expandAiResp}>{log.aiResponse}</div>
                          </div>
                        </div>
                        {log.retryCount > 0 && (
                          <div className={s.retryWarn}>⚠ {log.retryCount} retry(ies) needed</div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, iconCls }: { icon: React.ReactNode; label: string; value: string | number; iconCls: string }) {
  return (
    <div className={s.statCard}>
      <div className={s.statHead}>
        <div className={`${s.statIconBox} ${iconCls}`}>{icon}</div>
        <span className={s.statLabel}>{label}</span>
      </div>
      <div className={s.statValue}>{value}</div>
    </div>
  );
}
