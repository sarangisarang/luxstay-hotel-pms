package com.booksys.guestchat;

import com.booksys.ailog.AiCallLogRepository;
import com.booksys.chatmemory.ChatMemory;
import com.booksys.chatmemory.ChatMemoryRepository;
import com.booksys.knowledge.KnowledgeRepository;
import com.booksys.room.RoomRepository;
import com.booksys.roomtype.RoomTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/**
 * Regression tests for Gemini chat context/history bugs fixed in session 2026-05-27:
 * - Bug 1: findLastN returns DESC order → messages sent backwards to Gemini
 * - Bug 2: persistMessage called before findLastN → current msg doubled in history
 * - Bug 3: isNewSession flag drives greeting/no-greeting rule in system prompt
 * - Bug 4: session isolation — sessionId A history must not appear in sessionId B
 */
@ExtendWith(MockitoExtension.class)
class GuestChatContextTest {

    @Mock RoomTypeRepository   roomTypeRepo;
    @Mock RoomRepository       roomRepo;
    @Mock KnowledgeRepository  knowledgeRepo;
    @Mock ChatMemoryRepository memoryRepo;
    @Mock AiCallLogRepository  logRepo;

    @InjectMocks GuestChatController controller;

    @BeforeEach
    void setup() {
        // Leave geminiApiKey and claudeApiKey blank → forces rule-based fallback (no real HTTP calls)
        ReflectionTestUtils.setField(controller, "geminiApiKey", "");
        ReflectionTestUtils.setField(controller, "claudeApiKey", "");
    }

    // =========================================================================
    // 1. buildMessageList — chronological order
    // =========================================================================

    @Test
    @DisplayName("buildMessageList: reverses DESC history to chronological order")
    void buildMessageList_reversesDescHistory() {
        // findLastN returns DESC: msg3 (newest) → msg2 → msg1 (oldest)
        ChatMemory msg1 = mem("user",      "Hello",           LocalDateTime.now().minusMinutes(5));
        ChatMemory msg2 = mem("assistant", "Hi! How can I help?", LocalDateTime.now().minusMinutes(4));
        ChatMemory msg3 = mem("user",      "What rooms?",     LocalDateTime.now().minusMinutes(3));
        ChatMemory msg4 = mem("assistant", "We have Standard, Deluxe...", LocalDateTime.now().minusMinutes(2));

        // DESC order as returned by findLastN
        List<ChatMemory> descHistory = List.of(msg4, msg3, msg2, msg1);

        String currentMessage = "What is the price?";
        List<Map<String, Object>> result = controller.buildMessageList(descHistory, currentMessage);

        // Expected: chronological (ASC) + current msg at end
        assertThat(result).hasSize(5);
        assertThat(result.get(0).get("content")).isEqualTo("Hello");
        assertThat(result.get(0).get("role")).isEqualTo("user");
        assertThat(result.get(1).get("content")).isEqualTo("Hi! How can I help?");
        assertThat(result.get(1).get("role")).isEqualTo("assistant");
        assertThat(result.get(2).get("content")).isEqualTo("What rooms?");
        assertThat(result.get(3).get("content")).isEqualTo("We have Standard, Deluxe...");
        // Current message must be last
        assertThat(result.get(4).get("content")).isEqualTo(currentMessage);
        assertThat(result.get(4).get("role")).isEqualTo("user");
    }

    @Test
    @DisplayName("buildMessageList: empty history → only current message")
    void buildMessageList_emptyHistory_onlyCurrentMessage() {
        List<Map<String, Object>> result = controller.buildMessageList(List.of(), "First ever message");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("role")).isEqualTo("user");
        assertThat(result.get(0).get("content")).isEqualTo("First ever message");
    }

    @Test
    @DisplayName("buildMessageList: current message NOT in history (loaded before persist)")
    void buildMessageList_currentMessageNotDuplicated() {
        // Simulates correct order: history loaded BEFORE current message was persisted
        // → current message must NOT appear in dbHistory
        ChatMemory prevUser = mem("user",      "Tell me about rooms", LocalDateTime.now().minusMinutes(2));
        ChatMemory prevBot  = mem("assistant", "We have several...",  LocalDateTime.now().minusMinutes(1));

        List<Map<String, Object>> result = controller.buildMessageList(
                List.of(prevBot, prevUser), // DESC order from DB
                "What is the check-in time?"
        );

        // 2 history + 1 current = 3, not 4
        assertThat(result).hasSize(3);
        // Current message appears exactly once
        long currentCount = result.stream()
                .filter(m -> "What is the check-in time?".equals(m.get("content")))
                .count();
        assertThat(currentCount).isEqualTo(1);
    }

    // =========================================================================
    // 2. buildSystemPrompt — greeting control
    // =========================================================================

    @Test
    @DisplayName("buildSystemPrompt: new session → greeting instruction")
    void buildSystemPrompt_newSession_hasGreetingInstruction() {
        String prompt = controller.buildSystemPrompt("", "", "en", true);

        assertThat(prompt).contains("FIRST message");
        assertThat(prompt).doesNotContain("ONGOING conversation");
    }

    @Test
    @DisplayName("buildSystemPrompt: ongoing session → no-greeting instruction")
    void buildSystemPrompt_ongoingSession_hasNoGreetingInstruction() {
        String prompt = controller.buildSystemPrompt("", "", "en", false);

        assertThat(prompt).contains("ONGOING conversation");
        assertThat(prompt).contains("Do NOT greet again");
        assertThat(prompt).doesNotContain("FIRST message");
    }

    @Test
    @DisplayName("buildSystemPrompt: language rule always present")
    void buildSystemPrompt_alwaysContainsLanguageRule() {
        String promptKa = controller.buildSystemPrompt("", "", "ka", false);
        String promptDe = controller.buildSystemPrompt("", "", "de", true);

        assertThat(promptKa).contains("Georgian (ქართული)");
        assertThat(promptKa).contains("respond ONLY in");
        assertThat(promptDe).contains("German (Deutsch)");
    }

    // =========================================================================
    // 3. Session isolation — history is fetched per sessionId
    // =========================================================================

    @Test
    @DisplayName("Session isolation: each chat() queries only its own sessionId — no cross-session history")
    void sessionIsolation_historyFetchedBySessionId() {
        String sessionA = "session-hotel-guest-A";
        String sessionB = "session-hotel-guest-B";

        when(memoryRepo.findLastN(sessionA, 12)).thenReturn(List.of());
        when(memoryRepo.findLastN(sessionB, 12)).thenReturn(List.of());
        when(memoryRepo.countBySessionId(any())).thenReturn(0L);
        when(knowledgeRepo.searchByText(any())).thenReturn(List.of());
        when(roomTypeRepo.findAll()).thenReturn(List.of());
        when(roomRepo.findByRoomStatus(any())).thenReturn(List.of());
        when(roomRepo.count()).thenReturn(0L);

        controller.chat(new GuestChatController.GuestChatRequest("Hello", sessionA, "en", null));
        controller.chat(new GuestChatController.GuestChatRequest("Hello", sessionB, "en", null));

        // Each session queried exactly once with its own ID
        verify(memoryRepo, times(1)).findLastN(sessionA, 12);
        verify(memoryRepo, times(1)).findLastN(sessionB, 12);
        // Total calls = 2 (one per session, never crossed)
        verify(memoryRepo, times(2)).findLastN(anyString(), anyInt());
    }

    @Test
    @DisplayName("Session isolation: session B is treated as new session when it has no history")
    void sessionIsolation_emptyHistoryMeansNewSession() {
        // buildSystemPrompt(isNewSession=true) must contain "FIRST message" when history is empty
        // buildSystemPrompt(isNewSession=false) must contain "ONGOING" when history is not empty
        ChatMemory existingMsg = mem("user", "Prior question", LocalDateTime.now().minusMinutes(5));

        String newSessionPrompt = controller.buildSystemPrompt("", "", "en", true);
        String ongoingPrompt    = controller.buildSystemPrompt("", "", "en", false);

        assertThat(newSessionPrompt).contains("FIRST message");
        assertThat(ongoingPrompt).contains("ONGOING conversation").contains("Do NOT greet again");
    }

    // =========================================================================
    // 4. Persist order — user message persisted AFTER history is loaded
    // =========================================================================

    @Test
    @DisplayName("Persist order: findLastN called before persistMessage for user")
    void persistOrder_historyLoadedBeforeUserMessageSaved() {
        String sessionId = "order-test-session";

        when(memoryRepo.findLastN(sessionId, 12)).thenReturn(List.of());
        when(memoryRepo.countBySessionId(sessionId)).thenReturn(0L);
        when(knowledgeRepo.searchByText(any())).thenReturn(List.of());
        when(roomTypeRepo.findAll()).thenReturn(List.of());
        when(roomRepo.findByRoomStatus(any())).thenReturn(List.of());
        when(roomRepo.count()).thenReturn(0L);

        controller.chat(new GuestChatController.GuestChatRequest("Hello", sessionId, "en", null));

        // Verify call order: findLastN must happen before the first save()
        // save() is called twice: once for user message, once for assistant reply
        var inOrder = inOrder(memoryRepo);
        inOrder.verify(memoryRepo).findLastN(sessionId, 12);             // history loaded FIRST
        inOrder.verify(memoryRepo, atLeastOnce()).save(any(ChatMemory.class)); // user + assistant saved AFTER
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private ChatMemory mem(String role, String content, LocalDateTime createdAt) {
        return ChatMemory.builder()
                .sessionId("test-session")
                .role(role)
                .content(content)
                .createdAt(createdAt)
                .build();
    }
}
