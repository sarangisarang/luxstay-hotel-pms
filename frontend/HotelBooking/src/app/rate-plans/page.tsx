"use client";

import { useEffect, useState } from "react";
import api from "@/components/lib/axiosConfig";
import Link from "next/link";
import s from "@/styles/RatePlans.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type RatePlan = {
    id: string;
    name: string;
    description?: string;
    type: string;
    discountPercent: number;
    minNights?: number;
    validFrom?: string;
    validTo?: string;
    active: boolean;
};

const TYPE_CLS: Record<string, string> = {
    STANDARD:    s.typeStandard,
    EARLY_BIRD:  s.typeEarlyBird,
    LAST_MINUTE: s.typeLastMinute,
    WEEKEND:     s.typeWeekend,
    LONG_STAY:   s.typeLongStay,
    CORPORATE:   s.typeCorporate,
    PROMOTIONAL: s.typePromotional,
};

export default function RatePlansPage() {
  const { t } = useTranslation();
    const [plans, setPlans] = useState<RatePlan[]>([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        api.get("/api/rate-plans").then((r: { data: RatePlan[] }) => setPlans(r.data)).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const toggle = async (id: string) => {
        await api.patch(`/api/rate-plans/${id}/toggle`);
        load();
    };

    const deletePlan = async (id: string) => {
        if (!confirm("Delete this rate plan?")) return;
        await api.delete(`/api/rate-plans/${id}`);
        load();
    };

    if (loading) return <div className={s.loadMsg}>{t('loading')}</div>;

    return (
        <div className={s.page}>
            <div className={s.header}>
                <h1 className={s.title}>Rate Plans</h1>
                <Link href="/rate-plans/add" className={s.addLink}>+ Add Rate Plan</Link>
            </div>

            <div className={s.grid}>
                {plans.map(plan => (
                    <div key={plan.id} className={`${s.card} ${plan.active ? "" : s.cardInactive}`}>
                        <div className={s.cardHead}>
                            <div>
                                <div className={s.planName}>{plan.name}</div>
                                <span className={`${s.typePill} ${TYPE_CLS[plan.type] ?? s.typeStandard}`}>
                                    {plan.type.replace(/_/g," ")}
                                </span>
                            </div>
                            <div>
                                <div className={s.discountVal}>{plan.discountPercent}%</div>
                                <div className={s.discountSub}>discount</div>
                            </div>
                        </div>
                        {plan.description && <div className={s.planDesc}>{plan.description}</div>}
                        <div className={s.planMeta}>
                            {plan.minNights && <span>Min nights: {plan.minNights}</span>}
                            {plan.validFrom && <span>Valid from: {plan.validFrom}</span>}
                            {plan.validTo   && <span>Valid to: {plan.validTo}</span>}
                        </div>
                        <div className={s.cardActions}>
                            <button type="button" onClick={() => toggle(plan.id)}
                                className={`${s.btnToggle} ${plan.active ? s.btnDeactivate : s.btnActivate}`}>
                                {plan.active ? "Deactivate" : "Activate"}
                            </button>
                            <button type="button" onClick={() => deletePlan(plan.id)} className={s.btnDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
                {plans.length === 0 && (
                    <div className={s.emptyState}>
                        No rate plans yet. <Link href="/rate-plans/add" className={s.emptyLink}>Create one →</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
