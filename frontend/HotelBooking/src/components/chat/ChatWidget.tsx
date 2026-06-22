"use client";
/**
 * @file ChatWidget.tsx
 * Floating chat panel that connects a hotel guest to reception staff via
 * real-time STOMP WebSocket messages (see {@link useStompClient}).
 *
 * Outgoing messages are published to {@code /app/chat/<bookingId>} and
 * immediately appended to the local list (optimistic update). Incoming
 * messages arrive via the {@code /topic/chat/<bookingId>} subscription
 * managed by the hook.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useStompClient } from "./useStompClient";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

/** Shape of a chat message exchanged over the WebSocket. */
type ChatMessage = {
    id?: string;
    bookingId: string;
    hotelId?: string;
    senderId: string;
    receiverId?: string;
    content: string;
    sentAt?: string;
};

/** Props for {@link ChatWidget}. */
interface ChatWidgetProps {
    /** UUID of the booking this chat is scoped to. */
    bookingId: string;
    /** UUID of the currently authenticated user (used to align messages left/right). */
    currentUserId: string;
    /** UUID of the hotel — forwarded in outgoing message payloads. */
    hotelId?: string;
    /** UUID of the intended recipient (e.g. reception staff member). */
    receiverId?: string;
}

/**
 * Renders a self-contained chat widget for guest–staff messaging.
 *
 * @param props - See {@link ChatWidgetProps}.
 */
export default function ChatWidget({
    bookingId,
    currentUserId,
    hotelId,
    receiverId,
}: ChatWidgetProps) {
  const { t } = useTranslation();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState("");
    const listRef = useRef<HTMLDivElement>(null);

    const onIncoming = useCallback((msg: unknown) => {
        setMessages((prev) => [...prev, msg as ChatMessage]);
    }, []);

    const { send } = useStompClient(bookingId, onIncoming);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, [messages.length]);

    /**
     * Publishes the current input text as a chat message and optimistically
     * appends it to the local message list. No-ops on blank input.
     */
    function sendMessage(): void {
        const content = text.trim();
        if (!content) return;
        const payload: ChatMessage = {
            bookingId,
            hotelId,
            senderId: currentUserId,
            receiverId,
            content,
        };
        send(`/app/chat/${bookingId}`, payload);
        setMessages((prev) => [...prev, { ...payload, sentAt: new Date().toISOString() }]);
        setText("");
    }

    return (
        <div className="w-80 bg-white border rounded-2xl shadow-2xl flex flex-col h-[450px] overflow-hidden">
            <div className="bg-blue-600 text-white px-4 py-3 font-semibold">
                Chat with hotel staff
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                {messages.map((m, i) => {
                    const mine = m.senderId === currentUserId;
                    return (
                        <div key={m.id ?? i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`px-3 py-2 rounded-xl max-w-[75%] break-words ${
                                    mine ? "bg-blue-500 text-white" : "bg-white border"
                                }`}
                            >
                                <div className="text-sm">{m.content}</div>
                                {m.sentAt && (
                                    <div className="text-[10px] mt-1 opacity-60">{new Date(m.sentAt).toLocaleString()}</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="border-t p-2 flex gap-2 bg-white">
                <input
                    className="flex-1 border rounded-lg px-3 py-2 outline-none"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                    onClick={sendMessage}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
