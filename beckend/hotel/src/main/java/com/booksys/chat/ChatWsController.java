package com.booksys.chat;

import com.booksys.user.UserRepository;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

/**
 * Receives messages on /app/chat/{bookingId} and broadcasts to /topic/chat/{bookingId}.
 * Access to the conversation is checked by {@code WebSocketAuthInterceptor};
 * the sender is always the logged-in account (the client used to choose it).
 */
@Controller
public class ChatWsController {

    static final int MAX_LENGTH = 2000;

    private final ChatMessageRepository repo;
    private final SimpMessagingTemplate messaging;
    private final UserRepository userRepository;

    public ChatWsController(ChatMessageRepository repo, SimpMessagingTemplate messaging, UserRepository userRepository) {
        this.repo = repo;
        this.messaging = messaging;
        this.userRepository = userRepository;
    }

    @MessageMapping("/chat/{bookingId}")
    public void handle(@DestinationVariable UUID bookingId, @Payload ChatMessageDTO dto, Principal principal) {
        if (principal == null) throw new AccessDeniedException("Login required for the chat");
        UUID senderId = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new AccessDeniedException("Unknown account"))
                .getId();
        String content = dto == null || dto.content == null ? "" : dto.content.trim();
        if (content.isEmpty()) return;
        if (content.length() > MAX_LENGTH) content = content.substring(0, MAX_LENGTH);

        ChatMessage msg = new ChatMessage();
        msg.setBookingId(bookingId);
        msg.setSenderId(senderId);
        msg.setReceiverId(dto.receiverId);
        msg.setContent(content);

        ChatMessage saved = repo.save(msg);
        messaging.convertAndSend("/topic/chat/" + bookingId, saved);
    }
}
