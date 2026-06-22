package com.booksys.chat;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Persisted chat message bound to a specific booking (and thus its hotel).
 * Keep IDs as UUID; you can later add relations to Booking/Hotel entities.
 */

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID bookingId;

    /** Optional: store hotelId for staff scoping/filtering. */
    private UUID hotelId;

    @Column(nullable = false)
    private UUID senderId;   // guest or employee

    /** Optional: target user (or null for "any staff of that hotel"). */
    private UUID receiverId;

    @Column(nullable = false, length = 4000)
    private String content;

    @Column(nullable = false)
    private LocalDateTime sentAt = LocalDateTime.now();

    // ---- getters/setters ----
    public UUID getId() { return id; }
    public UUID getBookingId() { return bookingId; }
    public void setBookingId(UUID bookingId) { this.bookingId = bookingId; }
    public UUID getHotelId() { return hotelId; }
    public void setHotelId(UUID hotelId) { this.hotelId = hotelId; }
    public UUID getSenderId() { return senderId; }
    public void setSenderId(UUID senderId) { this.senderId = senderId; }
    public UUID getReceiverId() { return receiverId; }
    public void setReceiverId(UUID receiverId) { this.receiverId = receiverId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
}

