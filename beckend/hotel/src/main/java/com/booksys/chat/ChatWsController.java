package com.booksys.chat;

import com.booksys.chat.ChatMessageDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.UUID;

/**
 * Receives messages on /app/chat/{bookingId} and broadcasts to /topic/chat/{bookingId}
 */
@Controller
public class ChatWsController {

    private final ChatMessageRepository repo;
    private final SimpMessagingTemplate messaging;

    public ChatWsController(ChatMessageRepository repo, SimpMessagingTemplate messaging) {
        this.repo = repo;
        this.messaging = messaging;
    }

    @MessageMapping("/chat/{bookingId}")
    public void handle(@DestinationVariable UUID bookingId, @Payload ChatMessageDTO dto) {
        ChatMessage msg = new ChatMessage();
        msg.setBookingId(bookingId);
        msg.setSenderId(dto.senderId);
        msg.setReceiverId(dto.receiverId);
        msg.setContent(dto.content);

        ChatMessage saved = repo.save(msg);
        messaging.convertAndSend("/topic/chat/" + bookingId, saved);
    }
}

