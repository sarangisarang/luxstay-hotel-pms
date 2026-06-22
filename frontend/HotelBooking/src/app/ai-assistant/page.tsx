"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/components/lib/axiosConfig";
import s from "@/styles/AiAssistant.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type Message = { role: "user" | "assistant"; text: string; time: string };

const QUICK_PROMPTS = [
    "Hotel status overview",
    "Who is checking in today?",
    "How many rooms are free?",
    "Revenue this month",
    "Pending maintenance issues",
    "Housekeeping tasks",
    "Active bookings count",
    "Recent guest list",
];

function now() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AiAssistantPage() {
  const { t } = useTranslation();
    const [sessionId] = useState(() => crypto.randomUUID());
    const [messages, setMessages] = useState<Message[]>([{
        role: "assistant",
        text: "👋 I'm LuxBot — your AI assistant with live access to the hotel database.\n\nAsk me anything: room availability, today's check-ins/outs, revenue, bookings, housekeeping status, maintenance issues, or a full hotel overview.",
        time: now(),
    }]);
    const [input, setInput]     = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const sendRef   = useRef<(text?: string) => Promise<void>>(async () => {});

    useEffect(() => {
        (window as unknown as Record<string, unknown>).__luxSend =
            (text: string) => sendRef.current(text);
        return () => {
            delete (window as unknown as Record<string, unknown>).__luxSend;
        };
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const send = async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || loading) return;
        setInput("");
        setMessages(m => [...m, { role: "user", text: msg, time: now() }]);
        setLoading(true);
        try {
            const userEmail = localStorage.getItem("email") ?? "";
            const res = await api.post("/api/ai/chat", { message: msg, sessionId, userEmail });
            setMessages(m => [...m, { role: "assistant", text: res.data.reply ?? "No response.", time: now() }]);
        } catch (err: unknown) {
            const msg = (err as {response?: {status?: number}})?.response?.status === 403
                ? "⛔ Access denied in demo mode. Try the Admin or Reception account."
                : "⚠️ Connection error. Check that the backend is running, then try again.";
            setMessages(m => [...m, { role: "assistant", text: msg, time: now() }]);
        } finally {
            setLoading(false);
        }
    };
    sendRef.current = send;

    return (
        <div className={s.page}>
            <div className={s.header}>
                <div className={s.avatarLg}>🤖</div>
                <div>
                    <h1 className={s.h1}>LuxBot — AI Assistant</h1>
                    <div className={s.online}>● Live database access enabled</div>
                </div>
            </div>

            <div className={s.quickBar}>
                {QUICK_PROMPTS.map(p => (
                    <button key={p} type="button" className={s.quickBtn} onClick={() => send(p)}>{p}</button>
                ))}
            </div>

            <div className={s.chatWindow}>
                {messages.map((m, i) => (
                    <div key={i} className={`${s.msgRow} ${m.role === "user" ? s.msgRowUser : s.msgRowAssist}`}>
                        {m.role === "assistant" && (
                            <div className={`${s.avatarSm} ${s.avatarBot}`}>🤖</div>
                        )}
                        <div className={s.bubbleWrap}>
                            <div className={m.role === "user" ? s.bubbleUser : s.bubbleAssist}>{m.text}</div>
                            <div className={m.role === "user" ? s.timeUser : s.timeAssist}>{m.time}</div>
                        </div>
                        {m.role === "user" && (
                            <div className={`${s.avatarSm} ${s.avatarUser}`}>👤</div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className={s.typing}>
                        <div className={`${s.avatarSm} ${s.avatarBot}`}>🤖</div>
                        <div className={s.typingBubble}>
                            <span className={s.dots}>•••</span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className={s.inputRow}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Ask about rooms, bookings, revenue, maintenance…"
                    className={s.textInput}
                />
                <button
                    type="button"
                    onClick={() => send()}
                    disabled={loading || !input.trim()}
                    className={s.btnSend}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
