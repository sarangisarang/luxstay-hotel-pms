package com.booksys.chat;

import java.util.UUID;

/** Payload used from/to WebSocket and REST. */
public class ChatMessageDTO {
    public UUID bookingId;
    public UUID hotelId;     // optional; can be resolved server-side from booking
    public UUID senderId;
    public UUID receiverId;  // optional
    public String content;
}
