"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/AiAudit.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

// ── Types ────────────────────────────────────────────────────────────────────

type ScoreType = "STRONG" | "SUSPICIOUS" | "WEAK" | null;

interface AuditQuestion {
    category: string;
    question: string;
    critical: boolean;
}

interface CategoryResult {
    category: string;
    question: string;
    answer: string;
    score: ScoreType;
    feedback: string;
    critical: boolean;
}

interface AuditReport {
    companyName: string;
    results: CategoryResult[];
    strong: number;
    suspicious: number;
    weak: number;
    scorePercent: number;
    verdict: "TRUSTED" | "REVIEW_NEEDED" | "RED_FLAGS";
    generatedAt: string;
}

// ── Category labels ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
    ARCHITECTURE:       "Architecture",
    RAG_KNOWLEDGE_BASE: "RAG / Knowledge Base",
    VECTOR_DB:          "Vector DB",
    HALLUCINATION:      "Hallucination Control",
    HUMAN_HANDOFF:      "Human Handoff",
    AUTOMATION_TOOLS:   "Automation Tools",
    MONITORING_RETRY:   "Monitoring / Retry",
    LIVE_DEMO:          "Live Demo",
    INTEGRATIONS:       "Integrations",
    SECURITY_SECRETS:   "Security / Secrets",
    CUSTOMER_DATA:      "Customer Data",
    FALLBACK:           "Fallback",
    HOSTING_STACK:      "Hosting / Stack",
    CODE_QUALITY:       "Code Quality",
    OWNERSHIP_EXIT:     "Ownership / Exit",
};

// ── Score helpers → CSS classes ───────────────────────────────────────────────

function scoreIcon(sc: ScoreType) {
    if (sc === "STRONG")     return "✅";
    if (sc === "SUSPICIOUS") return "⚠️";
    if (sc === "WEAK")       return "❌";
    return "○";
}

function catTileCls(result: CategoryResult | undefined, isCurrent: boolean): string {
    if (isCurrent) return `${s.catTile} ${s.catTileCurrent}`;
    if (!result)   return s.catTile;
    if (result.score === "STRONG")     return `${s.catTile} ${s.catTileStrong}`;
    if (result.score === "SUSPICIOUS") return `${s.catTile} ${s.catTileSusp}`;
    if (result.score === "WEAK")       return `${s.catTile} ${s.catTileWeak}`;
    return s.catTile;
}

function answeredItemCls(score: ScoreType): string {
    if (score === "STRONG")     return `${s.answeredItem} ${s.answeredItemStrong}`;
    if (score === "SUSPICIOUS") return `${s.answeredItem} ${s.answeredItemSusp}`;
    if (score === "WEAK")       return `${s.answeredItem} ${s.answeredItemWeak}`;
    return `${s.answeredItem} ${s.answeredItemDef}`;
}

function answeredScoreCls(score: ScoreType): string {
    if (score === "STRONG")     return s.answeredScoreStrong;
    if (score === "SUSPICIOUS") return s.answeredScoreSusp;
    if (score === "WEAK")       return s.answeredScoreWeak;
    return s.answeredScoreDef;
}

function detailItemCls(score: ScoreType): string {
    if (score === "STRONG")     return `${s.detailItem} ${s.detailItemStrong}`;
    if (score === "SUSPICIOUS") return `${s.detailItem} ${s.detailItemSusp}`;
    if (score === "WEAK")       return `${s.detailItem} ${s.detailItemWeak}`;
    return `${s.detailItem} ${s.detailItemDef}`;
}

function detailScoreCls(score: ScoreType): string {
    if (score === "STRONG")     return s.detailScoreStrong;
    if (score === "SUSPICIOUS") return s.detailScoreSusp;
    if (score === "WEAK")       return s.detailScoreWeak;
    return s.detailScoreDef;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AiAuditPage() {
  const { t } = useTranslation();
    const [phase,       setPhase]       = useState<"setup" | "interview" | "report">("setup");
    const [companyName, setCompanyName] = useState("");
    const [questions,   setQuestions]   = useState<AuditQuestion[]>([]);
    const [currentIdx,  setCurrentIdx]  = useState(0);
    const [answer,      setAnswer]      = useState("");
    const [results,     setResults]     = useState<CategoryResult[]>([]);
    const [evaluating,  setEvaluating]  = useState(false);
    const [report,      setReport]      = useState<AuditReport | null>(null);
    const [generating,  setGenerating]  = useState(false);
    const [loadingQ,    setLoadingQ]    = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (phase !== "interview") return;
        setLoadingQ(true);
        api.get("/api/ai/audit/questions")
            .then(r => setQuestions(Array.isArray(r.data) ? r.data : []))
            .catch(() => setQuestions([]))
            .finally(() => setLoadingQ(false));
    }, [phase]);

    useEffect(() => {
        if (phase === "interview") textareaRef.current?.focus();
    }, [currentIdx, phase]);

    const current  = questions[currentIdx];
    const progress = questions.length > 0 ? Math.round((currentIdx / questions.length) * 100) : 0;

    async function submitAnswer() {
        if (!answer.trim() || !current) return;
        setEvaluating(true);
        try {
            const res = await api.post("/api/ai/audit/evaluate", {
                category: current.category, question: current.question,
                answer: answer.trim(), companyName,
            });
            const result: CategoryResult = {
                category: current.category, question: current.question,
                answer: answer.trim(), score: res.data.score,
                feedback: res.data.feedback, critical: res.data.critical,
            };
            const updated = [...results, result];
            setResults(updated);
            setAnswer("");
            if (currentIdx + 1 >= questions.length) {
                await generateReport(updated);
            } else {
                setCurrentIdx(i => i + 1);
            }
        } catch { alert("Evaluation failed. Please try again."); }
        finally { setEvaluating(false); }
    }

    async function generateReport(finalResults: CategoryResult[]) {
        setGenerating(true);
        try {
            const res = await api.post("/api/ai/audit/report", {
                companyName,
                answers: finalResults.map(r => ({ category: r.category, question: r.question, answer: r.answer })),
            });
            setReport(res.data);
            setPhase("report");
        } catch { alert("Failed to generate report."); }
        finally { setGenerating(false); }
    }

    function restart() {
        setPhase("setup");
        setCompanyName("");
        setQuestions([]);
        setCurrentIdx(0);
        setAnswer("");
        setResults([]);
        setReport(null);
    }

    // ── SETUP PHASE ─────────────────────────────────────────────────────────

    if (phase === "setup") {
        return (
            <div className={s.pageSetup}>
                <div className={s.setupHero}>
                    <div className={s.setupRobotIcon}>🤖</div>
                    <h1 className={s.setupTitle}>AI Company Audit</h1>
                    <p className={s.setupSub}>
                        Evaluate any AI automation company across 15 technical categories using our expert checklist.
                    </p>
                </div>

                <div className={s.setupCard}>
                    <div className={s.statsRow}>
                        {[["15", "Categories"], ["3", "Score levels"], ["100%", "Objective"]].map(([v, l]) => (
                            <div key={l} className={s.statItem}>
                                <div className={s.statItemValue}>{v}</div>
                                <div className={s.statItemLabel}>{l}</div>
                            </div>
                        ))}
                    </div>

                    <label className={s.fieldLabel}>Company Name *</label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="e.g. TechCorp AI Solutions"
                        onKeyDown={e => e.key === "Enter" && companyName.trim() && setPhase("interview")}
                        className={s.fieldInput}
                    />

                    <button
                        type="button"
                        disabled={!companyName.trim()}
                        onClick={() => setPhase("interview")}
                        className={companyName.trim() ? s.startBtnActive : s.startBtnDisabled}
                    >
                        Start Audit →
                    </button>
                </div>

                <div className={s.categoriesMeta}>
                    <p className={s.categoriesHint}>Categories evaluated:</p>
                    <div className={s.categoryChips}>
                        {Object.values(CATEGORY_LABELS).map(l => (
                            <span key={l} className={s.categoryChip}>{l}</span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── INTERVIEW PHASE ──────────────────────────────────────────────────────

    if (phase === "interview") {
        if (loadingQ || !questions.length) {
            return (
                <div className={s.loadingState}>
                    <div className={s.loadingIcon}>⏳</div>
                    <p className={s.loadingTitle}>Loading audit questions…</p>
                </div>
            );
        }

        if (generating) {
            return (
                <div className={s.loadingState}>
                    <div className={s.loadingIcon}>📊</div>
                    <p className={s.loadingTitle}>Generating your audit report…</p>
                    <p className={s.loadingSub}>Analysing all 15 categories</p>
                </div>
            );
        }

        return (
            <div className={s.pageInterview}>
                {/* Header */}
                <div className={s.interviewHeader}>
                    <div className={s.interviewTopRow}>
                        <span className={s.interviewCompany}>{companyName}</span>
                        <span className={s.interviewCounter}>{currentIdx + 1} / {questions.length}</span>
                    </div>
                    <progress
                        className={s.progressBar}
                        value={progress}
                        max={100}
                    />
                </div>

                {/* Category strip */}
                <div className={s.catStrip}>
                    {questions.map((q, i) => (
                        <div
                            key={q.category}
                            className={catTileCls(results[i], i === currentIdx)}
                            title={CATEGORY_LABELS[q.category] ?? q.category}
                        >
                            {results[i] ? scoreIcon(results[i].score) : (i === currentIdx ? "✎" : "")}
                        </div>
                    ))}
                </div>

                {/* Question card */}
                <div className={s.questionCard}>
                    <div className={s.questionTop}>
                        <div className={s.qNumBadge}>{currentIdx + 1}</div>
                        <div>
                            <div className={s.qMeta}>
                                <span className={s.qCategoryBadge}>
                                    {CATEGORY_LABELS[current?.category] ?? current?.category}
                                </span>
                                {current?.critical && (
                                    <span className={s.qCriticalBadge}>CRITICAL</span>
                                )}
                            </div>
                            <p className={s.questionText}>{current?.question}</p>
                        </div>
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="Type your detailed answer here…"
                        rows={5}
                        className={s.answerTextarea}
                    />

                    <div className={s.answerFooter}>
                        <span className={s.charCount}>{answer.length} chars — more detail = better score</span>
                        <button
                            type="button"
                            onClick={submitAnswer}
                            disabled={!answer.trim() || evaluating}
                            className={answer.trim() && !evaluating ? s.submitBtnActive : s.submitBtnDisabled}
                        >
                            {evaluating ? "Evaluating…" : currentIdx + 1 === questions.length ? "Finish & Generate Report" : "Next Question →"}
                        </button>
                    </div>
                </div>

                {/* Answered so far */}
                {results.length > 0 && (
                    <div className={s.answeredList}>
                        <p className={s.answeredHint}>Answered so far:</p>
                        <div className={s.answeredItems}>
                            {results.map(r => (
                                <div key={r.category} className={answeredItemCls(r.score)}>
                                    <span className={s.answeredIcon}>{scoreIcon(r.score)}</span>
                                    <div className={s.answeredContent}>
                                        <div className={s.answeredCategory}>
                                            {CATEGORY_LABELS[r.category] ?? r.category}
                                        </div>
                                        <div className={s.answeredFeedback}>{r.feedback}</div>
                                    </div>
                                    <span className={answeredScoreCls(r.score)}>{r.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── REPORT PHASE ─────────────────────────────────────────────────────────

    if (phase === "report" && report) {
        const verdictCls    = report.verdict === "TRUSTED" ? s.verdictTrusted : report.verdict === "REVIEW_NEEDED" ? s.verdictReview : s.verdictRedFlags;
        const verdictLblCls = report.verdict === "TRUSTED" ? s.verdictLabelTrusted : report.verdict === "REVIEW_NEEDED" ? s.verdictLabelReview : s.verdictLabelRedFlags;
        const verdictTxt    = report.verdict === "TRUSTED" ? "TRUSTED ✅" : report.verdict === "REVIEW_NEEDED" ? "REVIEW NEEDED ⚠️" : "RED FLAGS ❌";
        const verdictDesc   = report.verdict === "TRUSTED"
            ? "This company demonstrates strong technical capabilities across all major categories."
            : report.verdict === "REVIEW_NEEDED"
            ? "This company shows partial capabilities. Deeper due diligence is recommended before partnership."
            : "Multiple red flags detected. Significant gaps in technical implementation and processes.";
        const verdictEmoji  = report.verdict === "TRUSTED" ? "🏆" : report.verdict === "REVIEW_NEEDED" ? "🔍" : "🚨";

        return (
            <div className={s.pageReport}>
                {/* Banner */}
                <div className={s.reportBanner}>
                    <div className={s.reportBannerOrb} />
                    <p className={s.reportEyebrow}>AUDIT REPORT</p>
                    <h1 className={s.reportCompanyName}>{report.companyName}</h1>
                    <p className={s.reportDate}>{new Date(report.generatedAt).toLocaleString()}</p>
                    <div className={s.reportScores}>
                        {[
                            [String(report.scorePercent) + "%", "Overall Score"],
                            [String(report.strong),     "✅ Strong"],
                            [String(report.suspicious), "⚠️ Suspicious"],
                            [String(report.weak),       "❌ Weak"],
                        ].map(([v, l]) => (
                            <div key={l} className={s.reportScoreBox}>
                                <div className={s.reportScoreValue}>{v}</div>
                                <div className={s.reportScoreLabel}>{l}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Verdict */}
                <div className={`${s.verdictCard} ${verdictCls}`}>
                    <div className={s.verdictEmoji}>{verdictEmoji}</div>
                    <div>
                        <div className={verdictLblCls}>{verdictTxt}</div>
                        <div className={s.verdictDesc}>{verdictDesc}</div>
                    </div>
                </div>

                {/* Score breakdown */}
                <div className={s.breakdownCard}>
                    <h3 className={s.sectionHeading}>SCORE BREAKDOWN</h3>
                    <div className={s.breakdownRow}>
                        <div className={s.breakdownRowHead}>
                            <span className={s.breakdownLabelStrong}>Strong</span>
                            <span className={s.breakdownCount}>{report.strong} / 15</span>
                        </div>
                        <progress className={s.miniBarStrong} value={report.strong} max={15} />
                    </div>
                    <div className={s.breakdownRow}>
                        <div className={s.breakdownRowHead}>
                            <span className={s.breakdownLabelSusp}>Suspicious</span>
                            <span className={s.breakdownCount}>{report.suspicious} / 15</span>
                        </div>
                        <progress className={s.miniBarSusp} value={report.suspicious} max={15} />
                    </div>
                    <div className={s.breakdownRow}>
                        <div className={s.breakdownRowHead}>
                            <span className={s.breakdownLabelWeak}>Weak</span>
                            <span className={s.breakdownCount}>{report.weak} / 15</span>
                        </div>
                        <progress className={s.miniBarWeak} value={report.weak} max={15} />
                    </div>
                </div>

                {/* Detailed results */}
                <div className={s.detailCard}>
                    <h3 className={s.sectionHeading}>DETAILED RESULTS</h3>
                    <div className={s.detailItems}>
                        {report.results.map((r, i) => (
                            <div key={r.category} className={detailItemCls(r.score)}>
                                <div className={s.detailItemHead}>
                                    <div className={s.detailItemLeft}>
                                        <span className={s.detailNum}>#{i + 1}</span>
                                        <span className={s.detailCategoryName}>
                                            {CATEGORY_LABELS[r.category] ?? r.category}
                                        </span>
                                        {r.critical && <span className={s.detailCritical}>CRITICAL</span>}
                                    </div>
                                    <span className={detailScoreCls(r.score)}>
                                        {scoreIcon(r.score)} {r.score}
                                    </span>
                                </div>
                                <p className={s.detailAnswer}>&ldquo;{r.answer}&rdquo;</p>
                                <p className={s.detailFeedback}>💬 {r.feedback}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className={s.reportActions}>
                    <button type="button" className={s.printBtn} onClick={() => window.print()}>
                        🖨 Print / Export
                    </button>
                    <button type="button" className={s.newAuditBtn} onClick={restart}>
                        ↩ New Audit
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
