package com.booksys.config;

import com.booksys.booking.GuestBookingService;
import com.booksys.user.JwtAuthenticator;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WebSocketAuthInterceptorTest {

    private final JwtAuthenticator jwt = mock(JwtAuthenticator.class);
    private final GuestBookingService bookings = mock(GuestBookingService.class);
    private final WebSocketAuthInterceptor interceptor = new WebSocketAuthInterceptor(jwt, bookings);

    private final UsernamePasswordAuthenticationToken guest = new UsernamePasswordAuthenticationToken(
            "anna@example.org", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

    @Test
    void connectWithoutValidTokenIsRefused() {
        when(jwt.authenticate(any())).thenReturn(Optional.empty());
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(frame(StompCommand.CONNECT, null, null, null), null));
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(frame(StompCommand.CONNECT, "Bearer forged", null, null), null));
    }

    @Test
    void connectWithValidTokenSetsTheUser() {
        when(jwt.authenticate("good")).thenReturn(Optional.of(guest));
        Message<byte[]> msg = frame(StompCommand.CONNECT, "Bearer good", null, null);
        interceptor.preSend(msg, null);
        assertEquals(guest, StompHeaderAccessor.wrap(msg).getUser());
    }

    @Test
    void guestMayOnlyJoinOwnBookingConversation() {
        UUID own = UUID.randomUUID();
        UUID other = UUID.randomUUID();
        when(bookings.canAccess(guest, own)).thenReturn(true);
        when(bookings.canAccess(guest, other)).thenReturn(false);

        assertDoesNotThrow(() -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, null, "/topic/chat/" + own, guest), null));
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, null, "/topic/chat/" + other, guest), null));
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SEND, null, "/app/chat/" + other, guest), null));
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, null, "/topic/anything-else", guest), null));
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, null, "/topic/chat/" + own, null), null),
                "not connected with a token");
    }

    private static Message<byte[]> frame(StompCommand command, String authorization, String destination,
                                         UsernamePasswordAuthenticationToken user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (authorization != null) accessor.addNativeHeader("Authorization", authorization);
        if (destination != null) accessor.setDestination(destination);
        if (user != null) accessor.setUser(user);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
