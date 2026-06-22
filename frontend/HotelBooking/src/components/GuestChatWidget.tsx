"use client";

import { useState, useRef, useEffect } from "react";
import styles from "@/styles/GuestChatWidget.module.css";
import { useTranslation } from "react-i18next";
import i18n from "@/app/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

type Message = {
  role: "user" | "assistant" | "system";
  text: string;
  disclaimer?: string;
  isHandoff?: boolean;
};

const SESSION_ID = typeof crypto !== "undefined"
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2);

const QUICK_REPLY_KEYS = [
  "chatQuickRoomPrices", "chatQuickCheckIn", "chatQuickBookRoom", "chatQuickWifi", "chatQuickStaff",
];

export default function GuestChatWidget() {
  const { t } = useTranslation();
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>(() => [{
    role: "assistant" as const,
    text: t('chatWelcome'),
  }]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [unread, setUnread]       = useState(0);
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoffName, setHandoffName] = useState("");
  const [handoffEmail, setHandoffEmail] = useState("");
  const [handoffSent, setHandoffSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendText(text: string) {
    if (!text.trim() || loading) return;
    const trimmed = text.trim();

    setMessages(m => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/public/ai/guest-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId: SESSION_ID, language: i18n.language }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? t('chatSorryError');
      const disclaimer: string | undefined = data.disclaimer;
      const handoff: boolean = data.handoff === true;

      setMessages(m => [...m, {
        role: "assistant",
        text: reply,
        disclaimer,
        isHandoff: handoff,
      }]);

      if (handoff) setShowHandoff(true);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMessages(m => [...m, {
        role: "assistant",
        text: t('chatConnectionIssue'),
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function submitHandoff() {
    if (!handoffName.trim()) return;
    try {
      await fetch(`${API_BASE}/api/public/ai/handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: SESSION_ID,
          guestName: handoffName,
          guestEmail: handoffEmail,
          reason: "Guest requested live staff assistance via LuxBot",
        }),
      });
      setHandoffSent(true);
      setShowHandoff(false);
      setMessages(m => [...m, {
        role: "system",
        text: `${t('chatHandoffSent')} ${handoffName}`,
      }]);
    } catch {
      setMessages(m => [...m, { role: "system", text: t('chatHandoffFailed') }]);
      setShowHandoff(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(input); }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Open hotel assistant"
        className={styles.toggleBtn}
      >
        {open ? "✕" : "💬"}
        {!open && unread > 0 && (
          <span className={styles.unreadBadge}>{unread}</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className={styles.window}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.avatar}>🤖</div>
            <div>
              <div className={styles.botName}>LuxBot</div>
              <div className={styles.botStatus}>{t('chatBotStatus')}</div>
            </div>
            <div className={styles.onlineDot} />
            {!handoffSent && (
              <button
                type="button"
                className={styles.staffBtn}
                onClick={() => setShowHandoff(true)}
                title={t('chatTalkToPerson')}
              >
                {t('chatStaffBtnLabel')}
              </button>
            )}
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`${styles.msgRow} ${
                  m.role === "user" ? styles.msgRowUser :
                  m.role === "system" ? styles.msgRowSystem :
                  styles.msgRowAssistant
                }`}
              >
                <div className={`${styles.bubble} ${
                  m.role === "user" ? styles.bubbleUser :
                  m.role === "system" ? styles.bubbleSystem :
                  styles.bubbleAssistant
                }`}>
                  {m.text.replace(/\*\*(.*?)\*\*/g, "$1")}
                </div>
                {m.disclaimer && (
                  <div className={styles.disclaimer}>{m.disclaimer}</div>
                )}
              </div>
            ))}

            {loading && (
              <div className={`${styles.msgRow} ${styles.msgRowAssistant}`}>
                <div className={styles.typing}>
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Human Handoff form */}
          {showHandoff && (
            <div className={styles.handoffPanel}>
              <div className={styles.handoffTitle}>{t('chatHandoffTitle')}</div>
              <input
                className={styles.handoffInput}
                placeholder={t('chatNamePlaceholder')}
                value={handoffName}
                onChange={e => setHandoffName(e.target.value)}
              />
              <input
                className={styles.handoffInput}
                placeholder={t('chatEmailOptional')}
                type="email"
                value={handoffEmail}
                onChange={e => setHandoffEmail(e.target.value)}
              />
              <div className={styles.handoffActions}>
                <button type="button" className={styles.handoffCancel} onClick={() => setShowHandoff(false)}>{t('cancel')}</button>
                <button type="button" className={styles.handoffSubmit} onClick={submitHandoff} disabled={!handoffName.trim()}>
                  {t('chatSendRequest')}
                </button>
              </div>
            </div>
          )}

          {/* Quick replies */}
          {messages.length <= 1 && !showHandoff && (
            <div className={styles.quickReplies}>
              {QUICK_REPLY_KEYS.map(qk => (
                <button type="button" key={qk} onClick={() => sendText(t(qk))} className={styles.quickBtn}>
                  {t(qk)}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          {!showHandoff && (
            <div className={styles.inputRow}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={t('chatInputPlaceholder')}
                disabled={loading}
                className={styles.textInput}
              />
              <button
                type="button"
                onClick={() => sendText(input)}
                disabled={loading || !input.trim()}
                className={`${styles.sendBtn} ${input.trim() ? styles.sendBtnActive : styles.sendBtnDisabled}`}
              >
                ➤
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
