"use client";
/**
 * @file useStompClient.ts
 * React hook that manages a STOMP-over-SockJS WebSocket connection
 * for the real-time booking chat feature.
 *
 * The connection is established on mount and torn down on unmount.
 * It subscribes to {@code /topic/chat/<bookingId>} and delivers parsed
 * messages to the caller via {@code onMessage}.
 *
 * IMPORTANT: wrap {@code onMessage} in {@code useCallback} at the call site.
 * Without memoisation the hook re-connects on every parent render because
 * {@code onMessage} is listed as an effect dependency.
 */
import { useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client, IMessage } from "@stomp/stompjs";

/**
 * Opens and manages a STOMP WebSocket connection for a specific booking chat room.
 *
 * @param bookingId - UUID of the booking whose chat topic to subscribe to.
 * @param onMessage - Callback invoked with each parsed incoming message payload.
 *                    Must be stable (e.g. wrapped in {@code useCallback}) to avoid
 *                    unnecessary reconnections.
 * @param wsBase    - WebSocket server origin. Defaults to {@code NEXT_PUBLIC_API_BASE}
 *                    or {@code http://localhost:8080}.
 * @returns An object with a {@code send} function for publishing messages to a STOMP destination.
 */
export function useStompClient(
    bookingId: string,
    onMessage: (message: unknown) => void,
    wsBase: string = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080"
): { send: (destination: string, body: unknown) => void } {
    const clientRef = useRef<Client | null>(null);

    useEffect(() => {
        const socketUrl = `${wsBase.replace(/\/$/, "")}/ws`;
        const client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            reconnectDelay: 3000,
            debug: (str) => console.log("[STOMP]", str),
        });

        client.onConnect = () => {
            client.subscribe(`/topic/chat/${bookingId}`, (frame: IMessage) => {
                try {
                    onMessage(JSON.parse(frame.body));
                } catch {
                    console.warn("Invalid chat message:", frame.body);
                }
            });
        };

        client.onStompError = (frame) => {
            console.error("STOMP error:", frame.headers["message"], frame.body);
        };

        client.activate();
        clientRef.current = client;

        return () => { client.deactivate(); };
    }, [bookingId, wsBase, onMessage]);

    /**
     * Publishes a message to a STOMP destination.
     * No-ops with a console warning if the client is not yet connected.
     *
     * @param destination - STOMP destination string (e.g. {@code /app/chat/send}).
     * @param body        - JSON-serialisable payload to send.
     */
    function send(destination: string, body: unknown): void {
        if (!clientRef.current?.connected) {
            console.warn("STOMP not connected yet.");
            return;
        }
        clientRef.current.publish({ destination, body: JSON.stringify(body) });
    }

    return { send };
}
