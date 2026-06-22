"use client";

import { useRouter } from "next/navigation";
import styles from "@/styles/LandingPage.module.css";

/* ─── Demo accounts ─────────────────────────────────────────────────────── */
const DEMO_ROLES = [
    { label: "Admin Portal",   email: "admin@demo.com",     password: "Demo1234!", description: "Full PMS — analytics, settings, all modules", colorClass: "demoAdmin" },
    { label: "Reception Desk", email: "reception@demo.com", password: "Demo1234!", description: "Bookings, check-in, concierge, housekeeping",  colorClass: "demoReception" },
    { label: "Guest Portal",   email: "guest@demo.com",     password: "Demo1234!", description: "Booking history, AI concierge, reviews",        colorClass: "demoGuest" },
];

/* ─── Feature list ──────────────────────────────────────────────────────── */
const FEATURES = [
    { icon: "🏨", title: "Multi-Property Management",   desc: "Manage unlimited hotels, room types, floors, and rates from one dashboard." },
    { icon: "📅", title: "Live Room Calendar",          desc: "Drag-to-book Gantt view with real-time occupancy and conflict prevention." },
    { icon: "🤖", title: "AI Concierge + RAG",          desc: "LLM-powered chatbot grounded in your hotel's knowledge base — zero hallucinations." },
    { icon: "💳", title: "Payments & Invoices",         desc: "Stripe integration, multi-method payments, auto-generated PDF invoices." },
    { icon: "📊", title: "Revenue Analytics",           desc: "RevPAR, ADR, occupancy heatmaps, pace reports, and forecast charts." },
    { icon: "🌍", title: "18 Languages (i18n)",         desc: "Full UI translation — Georgian, Arabic RTL, German, French, Japanese and more." },
    { icon: "🔔", title: "Real-time Notifications",     desc: "WebSocket-powered alerts for bookings, check-ins, and concierge requests." },
    { icon: "🧹", title: "Housekeeping Board",          desc: "Kanban task board: daily cleans, turndowns, inspections with staff assignment." },
    { icon: "🔧", title: "Maintenance Tracker",         desc: "Log, prioritise, and resolve maintenance issues by room and category." },
    { icon: "⭐", title: "Loyalty & Rewards",           desc: "Bronze → Platinum tiers, points accrual, redemption on checkout." },
    { icon: "📦", title: "Channel Manager",             desc: "Sync availability to Booking.com, Expedia, Airbnb via unified listing API." },
    { icon: "🔐", title: "Role-based Access Control",  desc: "ADMIN, RECEPTION, and GUEST roles with fine-grained endpoint security." },
];

/* ─── Pricing plans ─────────────────────────────────────────────────────── */
const PLANS = [
    {
        name: "Starter", price: "$49", period: "/month", colorClass: "planStarter",
        note: "1 property · up to 30 rooms",
        features: ["Bookings & Calendar", "Payments & Invoices", "Guest Management", "Basic Analytics", "Email Support"],
        cta: "Start Free Trial",
    },
    {
        name: "Professional", price: "$149", period: "/month", colorClass: "planPro", popular: true,
        note: "Up to 5 properties · unlimited rooms",
        features: ["Everything in Starter", "AI Concierge + RAG", "Housekeeping & Maintenance", "Channel Manager", "18-Language UI", "Priority Support"],
        cta: "Start Free Trial",
    },
    {
        name: "Enterprise", price: "Custom", period: "", colorClass: "planEnterprise",
        note: "Unlimited properties · SLA guaranteed",
        features: ["Everything in Professional", "White-label branding", "Custom integrations", "Audit trail & compliance", "On-premise option", "Dedicated account manager"],
        cta: "Contact Sales",
    },
];

/* ─── Trust badges ──────────────────────────────────────────────────────── */
const TRUST = [
    { icon: "🔒", title: "JWT + BCrypt Auth",    desc: "Stateless JWT with HS384, BCrypt password hashing, role-scoped endpoints." },
    { icon: "🛡️", title: "OWASP Compliant",      desc: "Input validation, SQL injection prevention, XSS headers, CORS policy." },
    { icon: "🧪", title: "100% RAG Accuracy",    desc: "30-case evaluation suite — answerable + fallback + hallucination tests." },
    { icon: "📜", title: "Full Audit Trail",      desc: "Every create / update / delete action is logged with actor + timestamp." },
];

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function LandingPage() {
    const router = useRouter();

    function loginAs(email: string, password: string) {
        router.push(`/login?demo_email=${encodeURIComponent(email)}&demo_password=${encodeURIComponent(password)}`);
    }

    return (
        <div className={styles.page}>

            {/* ── HERO ──────────────────────────────────────────────────── */}
            <section className={styles.hero}>
                <div className={styles.heroBg} />
                <div className={styles.heroContent}>
                    <div className={styles.badge}>
                        <span className={styles.badgeDot} />
                        Enterprise Property Management System
                    </div>
                    <h1 className={styles.heroTitle}>
                        The smarter way to{" "}
                        <span className={styles.accent}>run your hotel</span>
                    </h1>
                    <p className={styles.heroSub}>
                        Full-stack PMS with AI concierge, live calendar, channel manager,
                        18-language UI, and revenue analytics — ready on day one.
                    </p>
                    <div className={styles.heroActions}>
                        <a href="#demo"    className={styles.btnPrimary}>Try Live Demo</a>
                        <a href="#pricing" className={styles.btnOutline}>View Pricing</a>
                    </div>
                    <div className={styles.heroPills}>
                        {["AI-Powered", "18 Languages", "Real-time", "OWASP Secure", "Open Source"].map(p => (
                            <span key={p} className={styles.heroPill}>{p}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── STATS BAR ─────────────────────────────────────────────── */}
            <section className={styles.statsBar}>
                {[
                    { value: "29+",  label: "Backend Modules" },
                    { value: "68+",  label: "Frontend Pages"  },
                    { value: "18",   label: "Languages"       },
                    { value: "100%", label: "RAG Accuracy"    },
                    { value: "<2ms", label: "AI Retrieval"    },
                ].map(s => (
                    <div key={s.label} className={styles.statItem}>
                        <span className={styles.statValue}>{s.value}</span>
                        <span className={styles.statLabel}>{s.label}</span>
                    </div>
                ))}
            </section>

            {/* ── LIVE DEMO ─────────────────────────────────────────────── */}
            <section id="demo" className={styles.section}>
                <div className={styles.sectionInner}>
                    <div className={styles.sectionTag}>Live Demo</div>
                    <h2 className={styles.sectionTitle}>Explore the full system — right now</h2>
                    <p className={styles.sectionSub}>
                        Three sandboxed demo accounts. No signup. No credit card.
                        Data resets automatically — you cannot break anything.
                    </p>

                    <div className={styles.demoCards}>
                        {DEMO_ROLES.map(role => (
                            <div key={role.label} className={`${styles.demoCard} ${styles[role.colorClass]}`}>
                                <div className={styles.demoCardAccent} />
                                <h3 className={styles.demoCardTitle}>{role.label}</h3>
                                <p className={styles.demoCardDesc}>{role.description}</p>
                                <div className={styles.demoCardCreds}>
                                    <code>{role.email}</code>
                                    <code>{role.password}</code>
                                </div>
                                <button
                                    type="button"
                                    className={styles.demoCardBtn}
                                    onClick={() => loginAs(role.email, role.password)}
                                >
                                    Log in as {role.label.split(" ")[0]} →
                                </button>
                            </div>
                        ))}
                    </div>

                    <p className={styles.demoNote}>
                        Demo accounts are read-only for structural operations — explore everything but cannot delete data or change system settings.
                    </p>
                </div>
            </section>

            {/* ── AI SECTION ────────────────────────────────────────────── */}
            <section className={styles.aiSection}>
                <div className={styles.sectionInner}>
                    <div className={styles.aiBadge}>🧠 RAG-Powered AI</div>
                    <h2 className={styles.aiSectionTitle}>AI Concierge with zero hallucinations</h2>
                    <p className={styles.aiSectionSub}>
                        LuxBot answers guest questions using your hotel&apos;s actual knowledge base — not
                        generic LLM guesses. 3-level PostgreSQL FTS retrieval, stop-word filtering,
                        and system-prompt guardrails ensure every answer is grounded in real data.
                    </p>
                    <div className={styles.aiStats}>
                        {[
                            { v: "30",   l: "Eval test cases"      },
                            { v: "100%", l: "Retrieval accuracy"   },
                            { v: "<2ms", l: "Avg retrieval latency" },
                            { v: "0",    l: "Hallucinations"       },
                        ].map(s => (
                            <div key={s.l} className={styles.aiStat}>
                                <span className={styles.aiStatValue}>{s.v}</span>
                                <span className={styles.aiStatLabel}>{s.l}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FEATURES ──────────────────────────────────────────────── */}
            <section id="features" className={styles.section}>
                <div className={styles.sectionInner}>
                    <div className={styles.sectionTag}>Features</div>
                    <h2 className={styles.sectionTitle}>Everything a modern hotel needs</h2>
                    <div className={styles.featuresGrid}>
                        {FEATURES.map(f => (
                            <div key={f.title} className={styles.featureCard}>
                                <span className={styles.featureIcon}>{f.icon}</span>
                                <h3 className={styles.featureTitle}>{f.title}</h3>
                                <p className={styles.featureDesc}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRICING ───────────────────────────────────────────────── */}
            <section id="pricing" className={`${styles.section} ${styles.pricingSection}`}>
                <div className={styles.sectionInner}>
                    <div className={styles.sectionTag}>Pricing</div>
                    <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
                    <p className={styles.sectionSub}>14-day free trial on all plans. No credit card required.</p>
                    <div className={styles.pricingGrid}>
                        {PLANS.map(plan => (
                            <div
                                key={plan.name}
                                className={`${styles.pricingCard} ${styles[plan.colorClass]} ${plan.popular ? styles.pricingCardPopular : ""}`}
                            >
                                {plan.popular && <div className={styles.popularBadge}>Most Popular</div>}
                                <h3 className={styles.planName}>{plan.name}</h3>
                                <div className={styles.planPrice}>
                                    <span className={styles.planAmount}>{plan.price}</span>
                                    <span className={styles.planPeriod}>{plan.period}</span>
                                </div>
                                <p className={styles.planNote}>{plan.note}</p>
                                <ul className={styles.planFeatures}>
                                    {plan.features.map(f => (
                                        <li key={f} className={styles.planFeature}>
                                            <span className={styles.planCheck}>✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <a href="#demo" className={styles.planCta}>{plan.cta}</a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── SECURITY / TRUST ──────────────────────────────────────── */}
            <section id="security" className={styles.section}>
                <div className={styles.sectionInner}>
                    <div className={styles.sectionTag}>Security & Trust</div>
                    <h2 className={styles.sectionTitle}>Enterprise-grade security built in</h2>
                    <div className={styles.trustGrid}>
                        {TRUST.map(t => (
                            <div key={t.title} className={styles.trustCard}>
                                <span className={styles.trustIcon}>{t.icon}</span>
                                <h3 className={styles.trustTitle}>{t.title}</h3>
                                <p className={styles.trustDesc}>{t.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── BOOK DEMO ─────────────────────────────────────────────── */}
            <section id="contact" className={styles.contactSection}>
                <div className={styles.sectionInner}>
                    <h2 className={styles.aiSectionTitle}>Ready to see it live?</h2>
                    <p className={styles.aiSectionSub}>
                        Schedule a personalised 30-minute walkthrough with the team.
                    </p>
                    <form
                        className={styles.contactForm}
                        onSubmit={e => { e.preventDefault(); alert("Thank you! We'll be in touch within 24 hours."); }}
                    >
                        <div className={styles.contactRow}>
                            <input className={styles.contactInput} type="text"  placeholder="Your name"        required />
                            <input className={styles.contactInput} type="email" placeholder="Work email"       required />
                        </div>
                        <input  className={styles.contactInput} type="text" placeholder="Hotel / company name" required />
                        <select
                            className={styles.contactInput}
                            aria-label="Number of properties"
                            defaultValue=""
                        >
                            <option value="" disabled>Number of properties</option>
                            <option>1 property</option>
                            <option>2–5 properties</option>
                            <option>6–20 properties</option>
                            <option>20+ properties</option>
                        </select>
                        <button type="submit" className={styles.btnPrimary}>
                            Book a Demo
                        </button>
                    </form>
                </div>
            </section>

            {/* ── FOOTER ────────────────────────────────────────────────── */}
            <footer className={styles.footer}>
                <div className={styles.footerInner}>
                    <span className={styles.footerLogo}>🏨 LuxStay</span>
                    <div className={styles.footerLinks}>
                        <a href="#features">Features</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#security">Security</a>
                        <a href="#demo">Live Demo</a>
                        <a href="/login">Staff Login</a>
                    </div>
                    <span className={styles.footerCopy}>© 2026 LuxStay. Built with Next.js + Spring Boot.</span>
                </div>
            </footer>
        </div>
    );
}
