package com.booksys.config;

import com.booksys.booking.GuestBookingService;
import com.booksys.user.CurrentUser;
import com.booksys.user.JwtAuthenticator;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Authentication and authorization for the STOMP chat (the WebSocket used to
 * be completely open: anyone could read {@code /topic/chat/{bookingId}} and
 * post messages under any sender ID).
 *
 * <ul>
 *   <li>CONNECT must carry {@code Authorization: Bearer <jwt>} (checked like
 *       an HTTP request, see {@link JwtAuthenticator}).</li>
 *   <li>SUBSCRIBE {@code /topic/chat/{id}} and SEND {@code /app/chat/{id}}:
 *       staff for any conversation, a guest account only for its own
 *       bookings. Other destinations are staff only.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Pattern CHAT_TOPIC = Pattern.compile("^/topic/chat/([0-9a-fA-F-]{36})$");
    private static final Pattern CHAT_SEND = Pattern.compile("^/app/chat/([0-9a-fA-F-]{36})$");

    private final JwtAuthenticator jwtAuthenticator;
    private final GuestBookingService guestBookingService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;   // heartbeats and internal messages
        }
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.CONNECT || command == StompCommand.STOMP) {
            String header = accessor.getFirstNativeHeader("Authorization");
            String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
            Authentication auth = jwtAuthenticator.authenticate(token)
                    .orElseThrow(() -> new AccessDeniedException("Login required for the chat"));
            accessor.setUser(auth);
        } else if (command == StompCommand.SUBSCRIBE) {
            authorize(accessor, CHAT_TOPIC);
        } else if (command == StompCommand.SEND) {
            authorize(accessor, CHAT_SEND);
        }
        return message;
    }

    private void authorize(StompHeaderAccessor accessor, Pattern chatDestination) {
        if (!(accessor.getUser() instanceof Authentication auth)) {
            throw new AccessDeniedException("Login required for the chat");
        }
        String destination = accessor.getDestination();
        Matcher m = destination != null ? chatDestination.matcher(destination) : null;
        if (m != null && m.matches()) {
            if (guestBookingService.canAccess(auth, UUID.fromString(m.group(1)))) return;
        } else if (CurrentUser.isStaff(auth)) {
            return;
        }
        throw new AccessDeniedException("No access to this conversation");
    }
}
