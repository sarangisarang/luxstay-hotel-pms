package com.booksys.chat;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/chat")
public class ChatRestController {

    private final ChatMessageRepository repo;
    private final com.booksys.booking.GuestBookingService guestBookingService;

    public ChatRestController(ChatMessageRepository repo, com.booksys.booking.GuestBookingService guestBookingService) {
        this.repo = repo;
        this.guestBookingService = guestBookingService;
    }

    /**
     * Ordered history of a booking/conversation chat room: staff for any room,
     * a guest account only for its own bookings (404 otherwise, so booking IDs
     * cannot be probed).
     */
    @GetMapping("/{bookingId}/messages")
    public List<ChatMessage> list(@PathVariable UUID bookingId, Authentication auth) {
        if (!guestBookingService.canAccess(auth, bookingId)) {
            throw new jakarta.persistence.EntityNotFoundException("Conversation not found");
        }
        return repo.findByBookingIdOrderBySentAtAsc(bookingId);
    }

    /**
     * Start or resume a direct chat between the current user and another user.
     * Returns a stable conversation ID derived from the two user IDs so the
     * same pair always gets the same room — no extra table needed.
     */
    @PostMapping("/start")
    public Map<String, String> startChat(@RequestBody Map<String, String> body, Authentication auth) {
        String userBId = body.getOrDefault("userB", "");
        String userAId = resolveCurrentUserId(auth);

        // Deterministic conversation ID: sort the two IDs so order doesn't matter
        String combined = Stream.of(userAId, userBId).sorted().reduce("", String::concat);
        UUID conversationId = UUID.nameUUIDFromBytes(combined.getBytes());

        return Map.of("id", conversationId.toString(), "userA", userAId, "userB", userBId);
    }

    /** Alternative endpoint path used as fallback by the frontend. */
    @PostMapping("/support/start/{userId}")
    public Map<String, String> startSupportChat(@PathVariable String userId, Authentication auth) {
        return startChat(Map.of("userB", userId), auth);
    }

    private String resolveCurrentUserId(Authentication auth) {
        if (auth == null) return UUID.randomUUID().toString();
        Object principal = auth.getPrincipal();
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails ud) {
            return ud.getUsername();
        }
        return auth.getName();
    }
}
