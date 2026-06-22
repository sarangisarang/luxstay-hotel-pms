'use client';

import { useState } from 'react';
import api from '@/components/lib/axiosConfig';

type EvalResult = {
    query: string;
    expectedBehavior: string;
    status: 'PASS' | 'FAIL';
    articlesRetrieved: number;
    latencyMs: number;
    retrievedTitles: string[];
};

type EvalReport = {
    total: number;
    passed: number;
    failed: number;
    overallAccuracyPct: number;
    answerableAccuracyPct: number;
    fallbackAccuracyPct: number;
    avgLatencyMs: number;
    results: EvalResult[];
};

const BEHAVIOR_STYLE: Record<string, string> = {
    ANSWER:   'bg-blue-100 text-blue-700',
    FALLBACK: 'bg-amber-100 text-amber-700',
    REFUSE:   'bg-red-100 text-red-700',
};

export default function AiEvalPage() {
    const [report, setReport]   = useState<EvalReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    const runEval = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get<EvalReport>('/api/ai/evaluate');
            setReport(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Evaluation failed');
        } finally {
            setLoading(false);
        }
    };

    const scoreColor = (pct: number) =>
        pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-amber-500' : 'text-red-600';

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">🧪 AI RAG Evaluation</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        30 test cases — retrieval correctness, fallback, hallucination resistance
                    </p>
                </div>
                <button
                    onClick={runEval}
                    disabled={loading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                               text-white rounded-xl font-semibold text-sm transition"
                >
                    {loading ? '⏳ Running…' : '▶ Run Evaluation'}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                    {error}
                </div>
            )}

            {/* ── Score Cards ── */}
            {report && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Overall Accuracy',    value: report.overallAccuracyPct,    suffix: '%' },
                            { label: 'Answerable',          value: report.answerableAccuracyPct, suffix: '%' },
                            { label: 'Fallback / Refuse',   value: report.fallbackAccuracyPct,   suffix: '%' },
                            { label: 'Avg Latency',         value: report.avgLatencyMs,          suffix: 'ms' },
                        ].map(({ label, value, suffix }) => (
                            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                                <p className="text-xs text-gray-500 mb-1">{label}</p>
                                <p className={`text-3xl font-bold ${suffix === '%' ? scoreColor(value) : 'text-gray-700'}`}>
                                    {value}{suffix}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* ── Summary Bar ── */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
                        <span className="text-sm text-gray-500">{report.total} tests</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 rounded-full transition-all duration-700"
                                style={{ width: `${report.overallAccuracyPct}%` }}
                            />
                        </div>
                        <span className="text-green-600 font-semibold text-sm">{report.passed} PASS</span>
                        <span className="text-red-500 font-semibold text-sm">{report.failed} FAIL</span>
                    </div>

                    {/* ── Result Table ── */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-gray-600 font-semibold w-8">#</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Query</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Expected</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Status</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Articles</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-semibold">Retrieved</th>
                                    <th className="text-right px-4 py-3 text-gray-600 font-semibold">ms</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.results.map((r, i) => (
                                    <tr key={i}
                                        className={`border-b border-gray-100 last:border-0 ${
                                            r.status === 'FAIL' ? 'bg-red-50/40' : ''
                                        }`}>
                                        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                                        <td className="px-4 py-2.5 text-gray-700 max-w-xs">{r.query}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                                ${BEHAVIOR_STYLE[r.expectedBehavior] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {r.expectedBehavior}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                                                ${r.status === 'PASS'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-gray-500">
                                            {r.articlesRetrieved}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 text-xs">
                                            {r.retrievedTitles.slice(0, 2).join(', ')}
                                            {r.retrievedTitles.length > 2 && ` +${r.retrievedTitles.length - 2}`}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                                            {r.latencyMs}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {!report && !loading && (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">🧬</p>
                    <p className="text-sm">Click &ldquo;Run Evaluation&rdquo; to test the RAG pipeline against 30 cases.</p>
                </div>
            )}
        </div>
    );
}
