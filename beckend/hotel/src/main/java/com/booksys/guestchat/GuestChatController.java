package com.booksys.guestchat;

import com.booksys.ailog.AiCallLog;
import com.booksys.ailog.AiCallLogRepository;
import com.booksys.chatmemory.ChatMemory;
import com.booksys.chatmemory.ChatMemoryRepository;
import com.booksys.knowledge.KnowledgeEntry;
import com.booksys.knowledge.KnowledgeRepository;
import com.booksys.maintenance.MaintenanceRepository;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import com.booksys.roomtype.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/public/ai")
@RequiredArgsConstructor
public class GuestChatController {

    private final RoomTypeRepository    roomTypeRepo;
    private final RoomRepository        roomRepo;
    private final KnowledgeRepository   knowledgeRepo;
    private final ChatMemoryRepository  memoryRepo;
    private final AiCallLogRepository   logRepo;

    @Value("${ai.groq.api-key:}")
    private String groqApiKey;

    private static final String GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";
    private static final int    MAX_HISTORY = 12;
    private static final int    MAX_RETRIES = 2;

    private static final Map<String, String> LANG_NAMES = Map.ofEntries(
        Map.entry("en", "English"), Map.entry("ka", "Georgian (ქართული)"),
        Map.entry("de", "German (Deutsch)"), Map.entry("fr", "French (Français)"),
        Map.entry("es", "Spanish (Español)"), Map.entry("it", "Italian (Italiano)"),
        Map.entry("pt", "Portuguese (Português)"), Map.entry("ru", "Russian (Русский)"),
        Map.entry("ar", "Arabic (العربية)"), Map.entry("zh", "Chinese (中文)"),
        Map.entry("ja", "Japanese (日本語)"), Map.entry("ko", "Korean (한국어)"),
        Map.entry("tr", "Turkish (Türkçe)"), Map.entry("nl", "Dutch (Nederlands)"),
        Map.entry("pl", "Polish (Polski)"), Map.entry("ro", "Romanian (Română)"),
        Map.entry("uk", "Ukrainian (Українська)"), Map.entry("hi", "Hindi (हिन्दी)")
    );

    // ── Handoff triggers ───────────────────────────────────────────────────
    private static final List<String> HANDOFF_PHRASES = List.of(
            "talk to staff", "speak to someone", "human agent", "real person",
            "connect me", "reception", "call me", "phone me", "urgent",
            "emergency", "not working", "broken", "complaint", "manager",
            "speak to a person", "live agent"
    );

    // ── Uncertainty markers (hallucination detection) ──────────────────────
    private static final List<String> UNCERTAINTY_MARKERS = List.of(
            "i think", "i believe", "i'm not sure", "i'm not certain",
            "probably", "might be", "could be", "i assume", "perhaps",
            "i cannot confirm", "i don't have access"
    );

    // =====================================================================
    // Main endpoint
    // =====================================================================

    @PostMapping("/guest-chat")
    public Map<String, Object> chat(@RequestBody GuestChatRequest req) {
        String message   = req.message() != null ? req.message().trim() : "";
        String sessionId = req.sessionId() != null ? req.sessionId() : "anon-" + UUID.randomUUID();
        String lang      = (req.language() != null && !req.language().isBlank()) ? req.language() : "en";

        if (message.isBlank()) return Map.of("reply", "How can I help you today?");

        long startMs = System.currentTimeMillis();

        // 1. Detect human handoff request
        if (isHandoffRequest(message)) {
            persistMessage(sessionId, "user", message, true);
            String handoffReply = "I'm connecting you with our reception team right now. " +
                    "You can also reach us directly at the front desk or by phone. " +
                    "A staff member will be with you shortly! 🛎️";
            persistMessage(sessionId, "assistant", handoffReply, false);
            saveLog(sessionId, message, handoffReply, false, false, 0,
                    System.currentTimeMillis() - startMs, 0, true, "HIGH");
            return Map.of("reply", handoffReply, "handoff", true);
        }

        // 2. Load history BEFORE persisting — so current message is not in history yet
        List<ChatMemory> dbHistory = memoryRepo.findLastN(sessionId, MAX_HISTORY);
        boolean isNewSession = dbHistory.isEmpty();

        // 3. Persist user message
        persistMessage(sessionId, "user", message, false);

        // 4. RAG — search knowledge base
        List<KnowledgeEntry> kbHits = searchKnowledgeBase(message);
        String ragContext = buildRagContext(kbHits);

        // 5. Build full hotel snapshot
        String hotelContext = buildHotelContext();

        // 6. Build message list (history in chronological order + current message)
        List<Map<String, Object>> messages = buildMessageList(dbHistory, message);

        // 7. Build system prompt with RAG + hotel context + language
        String systemPrompt = buildSystemPrompt(hotelContext, ragContext, lang, isNewSession);

        String reply;
        boolean usedAi = false;
        int retries = 0;

        // 7. Try Gemini first, fall back to Claude, then rule-based
        if (groqApiKey != null && !groqApiKey.isBlank()) {
            String groqReply = null;
            while (groqReply == null && retries <= MAX_RETRIES) {
                try {
                    groqReply = callGroq(systemPrompt, messages);
                } catch (Exception e) {
                    retries++;
                    log.warn("Groq guest-chat attempt {}/{} failed: {}", retries, MAX_RETRIES, e.getMessage());
                    if (retries > MAX_RETRIES) break;
                    sleepMs(300L * retries);
                }
            }
            if (groqReply != null) {
                usedAi = true;
                reply = applyHallucinationControl(groqReply, message);
            } else {
                reply = ruleBasedReply(message, hotelContext);
            }
        } else {
            reply = ruleBasedReply(message, hotelContext);
        }

        // 8. Persist assistant reply
        persistMessage(sessionId, "assistant", reply, false);

        // 9. Prune old messages (keep last MAX_HISTORY per session)
        pruneSession(sessionId);

        // 10. Log the call
        String confidence = scoreConfidence(reply);
        saveLog(sessionId, message, reply, usedAi, !kbHits.isEmpty(),
                kbHits.size(), System.currentTimeMillis() - startMs, retries, false, confidence);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("reply", reply);
        if ("LOW".equals(confidence)) {
            result.put("disclaimer", "This answer is based on general hotel information. For exact details, please contact reception.");
        }
        return result;
    }

    // =====================================================================
    // Handoff detection
    // =====================================================================

    private boolean isHandoffRequest(String message) {
        String lower = message.toLowerCase();
        return HANDOFF_PHRASES.stream().anyMatch(lower::contains);
    }

    // =====================================================================
    // RAG — Knowledge Base search
    // =====================================================================

    private List<KnowledgeEntry> searchKnowledgeBase(String query) {
        try {
            // Extract key terms (remove short stop words)
            String cleanQuery = Arrays.stream(query.split("\\s+"))
                    .filter(w -> w.length() > 2)
                    .collect(Collectors.joining(" "));
            if (cleanQuery.isBlank()) return List.of();

            List<KnowledgeEntry> hits = knowledgeRepo.searchByText(cleanQuery);
            if (hits.isEmpty()) {
                // Fallback: keyword search on the longest word
                String keyword = Arrays.stream(query.split("\\s+"))
                        .max(Comparator.comparingInt(String::length))
                        .orElse(query);
                hits = knowledgeRepo.searchByKeyword(keyword);
            }
            return hits;
        } catch (Exception e) {
            log.warn("KB search failed: {}", e.getMessage());
            return List.of();
        }
    }

    private String buildRagContext(List<KnowledgeEntry> hits) {
        if (hits.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("\n=== HOTEL KNOWLEDGE BASE ===\n");
        for (KnowledgeEntry e : hits) {
            sb.append(String.format("[%s] %s\n%s\n\n", e.getCategory(), e.getTitle(), e.getContent()));
        }
        return sb.toString();
    }

    // =====================================================================
    // Message history builder
    // =====================================================================

    // package-private for testing
    List<Map<String, Object>> buildMessageList(List<ChatMemory> dbHistory, String currentMessage) {
        // findLastN returns DESC (newest first) — reverse to get chronological order
        List<ChatMemory> ordered = new ArrayList<>(dbHistory);
        Collections.reverse(ordered);

        List<Map<String, Object>> msgs = new ArrayList<>();
        for (ChatMemory m : ordered) {
            msgs.add(Map.of("role", m.getRole(), "content", m.getContent()));
        }
        msgs.add(Map.of("role", "user", "content", currentMessage));
        return msgs;
    }

    // =====================================================================
    // Groq API call (OpenAI-compatible)
    // =====================================================================

    @SuppressWarnings("unchecked")
    private String callGroq(String systemPrompt, List<Map<String, Object>> messages) {
        List<Map<String, Object>> groqMessages = new ArrayList<>();
        groqMessages.add(Map.of("role", "system", "content", systemPrompt));
        groqMessages.addAll(messages);

        Map<String, Object> body = Map.of(
            "model",       GROQ_MODEL,
            "messages",    groqMessages,
            "max_tokens",  450,
            "temperature", 0.8
        );

        WebClient client = WebClient.builder()
                .baseUrl(GROQ_URL)
                .defaultHeader("Authorization", "Bearer " + groqApiKey)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();

        Map<String, Object> resp = client.post()
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (resp == null) throw new RuntimeException("null response from Groq");

        List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.get("choices");
        if (choices == null || choices.isEmpty()) throw new RuntimeException("no choices from Groq");

        Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
        if (msg == null || msg.get("content") == null) throw new RuntimeException("empty content from Groq");

        return (String) msg.get("content");
    }

    // =====================================================================
    // Hallucination control
    // =====================================================================

    private String applyHallucinationControl(String reply, String originalMessage) {
        String lower = reply.toLowerCase();

        // If Claude invents a phone number or email, strip or flag it
        if (reply.matches(".*\\+\\d{7,}.*") || reply.matches(".*\\d{3}[-.]\\d{4}.*")) {
            reply = reply.replaceAll("\\+?\\d[\\d\\s\\-().]{6,}", "[contact reception for phone number]");
        }

        // If Claude is uncertain about pricing, add a note
        boolean priceMentioned = lower.contains("€") || lower.contains("eur") || lower.contains("price") || lower.contains("cost");
        boolean uncertain = UNCERTAINTY_MARKERS.stream().anyMatch(lower::contains);
        if (priceMentioned && uncertain) {
            reply += "\n\n_Prices shown are indicative — please confirm exact rates at reception or during booking._";
        }

        return reply;
    }

    private String scoreConfidence(String reply) {
        String lower = reply.toLowerCase();
        long uncertainCount = UNCERTAINTY_MARKERS.stream().filter(lower::contains).count();
        if (uncertainCount >= 2) return "LOW";
        if (uncertainCount == 1) return "MEDIUM";
        return "HIGH";
    }

    // =====================================================================
    // System prompt with RAG context
    // =====================================================================

    // package-private for testing
    String buildSystemPrompt(String hotelContext, String ragContext, String lang, boolean isNewSession) {
        String langName = LANG_NAMES.getOrDefault(lang, "English");
        String greetingRule = isNewSession
            ? "- This is the guest's FIRST message — give a brief, warm greeting.\n"
            : "- This is an ONGOING conversation. Do NOT greet again. Respond naturally, continuing mid-conversation.\n";
        return "You are LuxBot, the friendly AI concierge for LuxStay Hotel.\n" +
               "Help guests with rooms, bookings, check-in/out, amenities, and policies.\n\n" +
               "CRITICAL LANGUAGE RULE: You MUST respond ONLY in " + langName + " (" + lang + "). " +
               "No matter what language the user writes in — your reply must always be in " + langName + ". " +
               "This is the hotel app's display language and cannot be changed.\n\n" +
               "CONVERSATION RULES:\n" +
               greetingRule +
               "- If the guest shares their name, use it in your reply.\n" +
               "- ONLY use the data provided below — never invent prices, room numbers, or policies.\n" +
               "- Keep replies short and warm (2–4 sentences). Vary your wording each turn.\n" +
               "- If unsure, say \"For exact details, please contact our reception team.\"\n" +
               "- Never repeat the same response twice in a row.\n" +
               "- Do NOT say \"Thank you for your question\" every reply.\n" +
               "- If the guest seems frustrated or needs urgent help, suggest they talk to staff.\n" +
               "- To book, guide guests to click \"Book Now\" or visit /book on the site.\n\n" +
               hotelContext + ragContext;
    }

    // =====================================================================
    // Hotel context (live DB)
    // =====================================================================

    private String buildHotelContext() {
        var roomTypes = roomTypeRepo.findAll();
        long freeCount  = roomRepo.findByRoomStatus(RoomStatus.FREE).size();
        long totalCount = roomRepo.count();

        StringBuilder sb = new StringBuilder("=== LIVE HOTEL DATA ===\n");
        sb.append(String.format("Availability: %d of %d rooms currently free.\n\n", freeCount, totalCount));

        if (!roomTypes.isEmpty()) {
            sb.append("ROOM TYPES:\n");
            for (var rt : roomTypes) {
                sb.append(String.format("• %s — €%.0f/night, up to %d guests",
                        rt.getName(),
                        rt.getPricePerNight() != null ? rt.getPricePerNight() : BigDecimal.ZERO,
                        rt.getCapacity()));
                if (rt.getDescription() != null && !rt.getDescription().isBlank()) {
                    sb.append(". ").append(rt.getDescription());
                }
                sb.append("\n");
                List<String> amenities = collectAmenities(rt);
                if (!amenities.isEmpty()) {
                    sb.append("  Amenities: ").append(String.join(", ", amenities)).append("\n");
                }
            }
        }
        return sb.toString();
    }

    private List<String> collectAmenities(com.booksys.roomtype.RoomType rt) {
        List<String> list = new ArrayList<>();
        if (rt.isAirConditioning())           list.add("Air conditioning");
        if (rt.isFreeWifi() || rt.isInternet()) list.add("Free WiFi");
        if (rt.isTv() || rt.isFlatScreenTv())  list.add("Flat-screen TV");
        if (rt.isBalcony())                    list.add("Balcony");
        if (rt.isMinibar())                    list.add("Minibar");
        if (rt.isRoomService())                list.add("Room service");
        if (rt.isSafe())                       list.add("Safe");
        if (rt.isHairDryer())                  list.add("Hair dryer");
        if (rt.isSoundproofing())              list.add("Soundproofing");
        if (rt.isFitnessCentre())              list.add("Fitness centre access");
        if (rt.isFacilitiesForDisabledGuests()) list.add("Accessible facilities");
        return list;
    }

    // =====================================================================
    // Rule-based fallback
    // =====================================================================

    private String ruleBasedReply(String message, String hotelContext) {
        String lower = message.toLowerCase();

        if (lower.contains("parking")) return "Secured underground parking is available 24/7 at €12/day for hotel guests. Spaces are limited — please reserve at booking or contact reception. EV charging is available on level B1.";
        if (lower.contains("breakfast") || lower.contains("restaurant") || lower.contains("food") || lower.contains("eat") || lower.contains("lunch") || lower.contains("dinner")) return "Breakfast buffet is served daily 07:00–10:30 in the main restaurant. Included with Deluxe and Suite bookings. Our restaurant is also open for lunch (12:00–15:00) and dinner (18:00–22:30).";
        if (lower.contains("pet") || lower.contains("dog") || lower.contains("cat")) return "We're pet-friendly! Small pets (under 10kg) are welcome in designated rooms for a €20/night surcharge. Please inform us when booking.";

        if (lower.contains("room") || lower.contains("available") || lower.contains("price")
                || lower.contains("cost") || lower.contains("rate") || lower.contains("type")) {
            var roomTypes = roomTypeRepo.findAll();
            if (roomTypes.isEmpty()) return "We're updating our room inventory. Please contact reception for availability.";
            StringBuilder sb = new StringBuilder("Here are our room types:\n\n");
            for (var rt : roomTypes) {
                sb.append(String.format("🛏 **%s** — €%.0f/night for up to %d guests\n",
                        rt.getName(),
                        rt.getPricePerNight() != null ? rt.getPricePerNight() : BigDecimal.ZERO,
                        rt.getCapacity()));
            }
            sb.append("\nClick **Book Now** to reserve your room!");
            return sb.toString();
        }
        if (lower.contains("book") || lower.contains("reserv")) return "I'd love to help you book! Click **Book Now** at the top or visit /book. Need help choosing a room? Just tell me your preferences! 😊";
        if (lower.contains("check-in") || lower.contains("checkin"))  return "Check-in is from 14:00. Early check-in from 10:00 is available on request, subject to availability.";
        if (lower.contains("check-out") || lower.contains("checkout")) return "Check-out is by 12:00 noon. Late check-out until 14:00 is available for a small fee — just let reception know.";
        if (lower.contains("wifi") || lower.contains("internet")) return "Complimentary high-speed WiFi is available throughout the hotel. Ask reception for the password at check-in.";
        if (lower.contains("cancel")) return "Cancellations are free up to 24 hours before check-in. Visit our booking page or contact reception to cancel.";
        if (lower.contains("pay") || lower.contains("card")) return "We accept all major cards, processed securely via Stripe. Payment is taken when you confirm your booking.";
        if (lower.contains("hello") || lower.contains("hi") || lower.contains("hey") || lower.equals("start")) {
            long free = roomRepo.findByRoomStatus(RoomStatus.FREE).size();
            return String.format("Welcome to LuxStay! 🏨 I'm LuxBot, your virtual concierge. We have %d rooms available right now. Ask me about rooms, prices, check-in/out, or how to book!", free);
        }

        Matcher nameMatcher = Pattern.compile("(?:my name is|i am|i'm|im)\\s+([a-zA-Z]+)", Pattern.CASE_INSENSITIVE).matcher(message);
        if (nameMatcher.find()) {
            String name = nameMatcher.group(1);
            name = Character.toUpperCase(name.charAt(0)) + name.substring(1).toLowerCase();
            return "Nice to meet you, " + name + "! 😊 I'm LuxBot. How can I help with your stay? Ask me about our rooms, prices, or how to make a booking.";
        }
        if (lower.contains("thank")) return "You're very welcome! 😊 Is there anything else I can help you with?";
        if (lower.contains("bye") || lower.contains("goodbye")) return "Goodbye! 👋 Hope to see you at LuxStay soon. Have a wonderful day!";

        String[] fallbacks = {
            "I'm not sure I understood that — could you rephrase? I can help with rooms, prices, availability, or booking. 😊",
            "Hmm, I specialise in LuxStay hotel topics. Ask me about rooms, prices, check-in/out, or how to book!",
            "Could you tell me a bit more? I'm great with room recommendations and booking questions.",
            "That's a bit outside my area! Try asking about our rooms, prices, or how to make a reservation.",
        };
        return fallbacks[Math.abs(message.hashCode()) % fallbacks.length];
    }

    // =====================================================================
    // Persistence helpers
    // =====================================================================

    private void persistMessage(String sessionId, String role, String content, boolean handoff) {
        memoryRepo.save(ChatMemory.builder()
                .sessionId(sessionId)
                .role(role)
                .content(content)
                .handoffRequested(handoff)
                .build());
    }

    private void pruneSession(String sessionId) {
        long count = memoryRepo.countBySessionId(sessionId);
        if (count > MAX_HISTORY * 2) {
            // Keep only the most recent MAX_HISTORY messages
            List<ChatMemory> all = memoryRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
            List<ChatMemory> toDelete = all.subList(0, (int)(count - MAX_HISTORY));
            memoryRepo.deleteAll(toDelete);
        }
    }

    private void saveLog(String sessionId, String userMsg, String reply,
                         boolean usedClaude, boolean usedRag, int ragHits,
                         long latencyMs, int retries, boolean handoff, String confidence) {
        try {
            logRepo.save(AiCallLog.builder()
                    .endpoint("guest-chat")
                    .sessionId(sessionId)
                    .userMessage(userMsg)
                    .aiResponse(reply)
                    .usedClaude(usedClaude)
                    .usedRag(usedRag)
                    .ragHits(ragHits)
                    .latencyMs(latencyMs)
                    .retryCount(retries)
                    .handoffTriggered(handoff)
                    .confidenceLevel(confidence)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to save AI call log: {}", e.getMessage());
        }
    }

    private void sleepMs(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
    }

    // =====================================================================
    // Request record
    // =====================================================================

    public record GuestChatRequest(
            String message,
            String sessionId,
            String language,
            List<Map<String, String>> history
    ) {}
}
