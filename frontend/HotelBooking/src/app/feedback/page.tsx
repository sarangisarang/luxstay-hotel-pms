"use client";

import { useEffect, useState } from "react";
import FeedbackReviewList from "@/components/tables/FeedbackReviewList";
import AiInsightCard from "@/components/AiInsightCard";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/FeedbackStats.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Stats = {
    total: number; averageRating: number; satisfaction: number;
    positive: number; negative: number;
    distribution: Record<string, number>;
};

const STAR_BAR_CLS = [s.star1, s.star2, s.star3, s.star4, s.star5];

export default function FeedbackPage() {
  const { t } = useTranslation();
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        api.get("/api/feedback-reviews/stats").then(r => setStats(r.data)).catch(() => {});
    }, []);

    return (
        <div className="fade-in">
            <AiInsightCard endpoint="/api/ai/insights/feedback" title={t('aiGuestSentimentAnalysis')} compact />

            {/* Satisfaction summary */}
            {stats && stats.total > 0 && (
                <div className={s.statsCard}>
                    <div className={s.statsRow}>
                        <div className={s.scoreBlock}>
                            <div className={s.scoreValue}>{Number(stats.averageRating).toFixed(1)}</div>
                            <div className={s.scoreLabel}>{t('averageRating')}</div>
                            <div className={s.stars}>
                                {(() => { const f = Math.min(5, Math.max(0, Math.round(stats.averageRating / 2))); return `${"★".repeat(f)}${"☆".repeat(5 - f)}`; })()}
                            </div>
                        </div>
                        <div className={s.scoreBlock}>
                            <div className={s.scoreValue}>{stats.satisfaction}%</div>
                            <div className={s.scoreLabel}>{t('guestSatisfaction')}</div>
                            <div className={s.scoreSubLabel}>{t('ratingsLabel')}</div>
                        </div>
                        <div className={s.scoreBlock}>
                            <div className={s.scoreValue}>{stats.total}</div>
                            <div className={s.scoreLabel}>{t('totalReviews')}</div>
                            <div className={s.scoreSubLabel}>{stats.positive} {t('positive')} · {stats.negative} {t('negative')}</div>
                        </div>

                        {/* Rating distribution bars */}
                        <div className={s.distBlock}>
                            {[5, 4, 3, 2, 1].map(star => {
                                const count = stats.distribution[String(star)] ?? 0;
                                const pct   = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                return (
                                    <div key={star} className={s.distRow}>
                                        <span className={s.distStar}>{star}★</span>
                                        <progress
                                            className={`${s.distBar} ${STAR_BAR_CLS[star - 1]}`}
                                            value={Math.round(pct)}
                                            max={100}
                                        />
                                        <span className={s.distCount}>{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <FeedbackReviewList />
        </div>
    );
}
