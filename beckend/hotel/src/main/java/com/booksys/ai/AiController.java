package com.booksys.ai;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.feedbackreview.FeedbackReviewRepository;
import com.booksys.guest.GuestRepository;
import com.booksys.housekeeping.HousekeepingRepository;
import com.booksys.housekeeping.HousekeepingStatus;
import com.booksys.knowledge.KnowledgeSearchService;
import com.booksys.maintenance.MaintenanceRepository;
import com.booksys.maintenance.MaintenanceStatus;
import com.booksys.payment.PaymentRepository;
import com.booksys.payment.PaymentStatus;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import com.booksys.roomtype.RoomTypeRepository;
import com.booksys.servicerequest.ServiceRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiMessageRepository    msgRepo;
    private final BookingRepository      bookingRepo;
    private final RoomRepository         roomRepo;
    private final RoomTypeRepository     roomTypeRepo;
    private final GuestRepository        guestRepo;
    private final PaymentRepository      paymentRepo;
    private final ServiceRequestRepository serviceRequestRepo;
    private final HousekeepingRepository housekeepingRepo;
    private final MaintenanceRepository  maintenanceRepo;
    private final FeedbackReviewRepository feedbackRepo;
    private final KnowledgeSearchService knowledgeSearch;

    @Value("${ai.groq.api-key:}")
    private String apiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    // ───────────────────────────── Endpoints ─────────────────────────────

    @GetMapping("/history/{sessionId}")
    public List<AiMessage> history(@PathVariable UUID sessionId) {
        return msgRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    @DeleteMapping("/history/{sessionId}")
    public Map<String, String> clearHistory(@PathVariable UUID sessionId) {
        msgRepo.deleteAll(msgRepo.findBySessionIdOrderByCreatedAtAsc(sessionId));
        return Map.of("status", "cleared");
    }

    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody ChatRequest req) {
        UUID sid = req.sessionId() != null && !req.sessionId().isBlank()
                ? UUID.fromString(req.sessionId())
                : UUID.randomUUID();

        // Save user message
        msgRepo.save(AiMessage.builder()
                .sessionId(sid).role("user")
                .content(req.message()).userEmail(req.userEmail()).build());

        // Build live hotel snapshot + RAG knowledge context
        String snapshot = buildHotelSnapshot();
        String knowledge = knowledgeSearch.buildContext(req.message());
        String systemPrompt = buildSystemPrompt(snapshot, knowledge);

        // Load conversation history (last 10 turns)
        List<Map<String, Object>> history = msgRepo
                .findBySessionIdOrderByCreatedAtAsc(sid)
                .stream()
                .map(m -> Map.<String, Object>of("role", m.getRole(), "content", m.getContent()))
                .collect(Collectors.toList());

        if (apiKey == null || apiKey.isBlank()) {
            String reply = smartFallback(req.message(), snapshot, knowledge);
            msgRepo.save(AiMessage.builder().sessionId(sid).role("assistant")
                    .content(reply).userEmail(req.userEmail()).build());
            return Map.of("reply", reply, "model", "data-mode", "tokens", 0, "sessionId", sid.toString());
        }

        try {
            // Build OpenAI-compatible messages (Groq uses same format)
            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));
            messages.addAll(history);

            Map<String, Object> body = Map.of(
                "model",       GROQ_MODEL,
                "messages",    messages,
                "max_tokens",  700,
                "temperature", 0.4
            );

            WebClient client = WebClient.builder()
                    .baseUrl(GROQ_URL)
                    .defaultHeader("Authorization", "Bearer " + apiKey)
                    .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .build();

            @SuppressWarnings("unchecked")
            Map<String, Object> resp = client.post()
                    .bodyValue(body).retrieve()
                    .bodyToMono(Map.class).block();

            if (resp == null) throw new RuntimeException("null response");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.get("choices");
            String reply = smartFallback(req.message(), snapshot, knowledge);
            if (choices != null && !choices.isEmpty()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
                if (msg != null && msg.get("content") != null) {
                    reply = (String) msg.get("content");
                }
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> usage = (Map<String, Object>) resp.get("usage");
            int tokens = usage != null ? ((Number) usage.getOrDefault("completion_tokens", 0)).intValue() : 0;

            msgRepo.save(AiMessage.builder().sessionId(sid).role("assistant")
                    .content(reply).userEmail(req.userEmail()).build());

            return Map.of("reply", reply, "model", GROQ_MODEL, "tokens", tokens, "sessionId", sid.toString());

        } catch (Exception e) {
            log.error("Groq API error: {}", e.getMessage());
            String fallback = smartFallback(req.message(), snapshot, knowledge);
            msgRepo.save(AiMessage.builder().sessionId(sid).role("assistant")
                    .content(fallback).userEmail(req.userEmail()).build());
            return Map.of("reply", fallback, "model", "fallback", "tokens", 0, "sessionId", sid.toString());
        }
    }

    // ───────────────────────── Live DB Snapshot ───────────────────────────

    private String buildHotelSnapshot() {
        StringBuilder sb = new StringBuilder();
        LocalDate today = LocalDate.now();

        // ── 1. Rooms ──
        long totalRooms    = roomRepo.count();
        long freeRooms     = roomRepo.findByRoomStatus(RoomStatus.FREE).size();
        long occupiedRooms = roomRepo.findByRoomStatus(RoomStatus.OCCUPIED).size();
        long reservedRooms = roomRepo.findByRoomStatus(RoomStatus.RESERVED).size();
        long maintRooms    = roomRepo.findByRoomStatus(RoomStatus.MAINTENANCE).size();

        sb.append("=== ROOMS (live) ===\n");
        sb.append(String.format("Total: %d | Free: %d | Occupied: %d | Reserved: %d | Maintenance: %d\n",
                totalRooms, freeRooms, occupiedRooms, reservedRooms, maintRooms));

        // ── 2. Room types ──
        sb.append("\n=== ROOM TYPES & PRICES ===\n");
        roomTypeRepo.findAll().forEach(rt ->
                sb.append(String.format("• %s — €%.0f/night, max %d guests\n",
                        rt.getName(),
                        rt.getPricePerNight() != null ? rt.getPricePerNight() : BigDecimal.ZERO,
                        rt.getCapacity())));

        // ── 3. Bookings today ──
        List<Booking> checkInsToday  = bookingRepo.findByCheckInDateAndBookingStatusNot(today, BookingStatus.CANCELLED);
        List<Booking> checkOutsToday = bookingRepo.findByCheckOutDateAndBookingStatusNot(today, BookingStatus.CANCELLED);

        sb.append(String.format("\n=== TODAY (%s) ===\n", today.format(DATE_FMT)));
        sb.append(String.format("Check-ins today: %d\n", checkInsToday.size()));
        checkInsToday.forEach(b -> {
            String name = b.getGuest() != null
                    ? b.getGuest().getFirstName() + " " + b.getGuest().getLastName() : "Unknown";
            String room = b.getRoom() != null ? "Room " + b.getRoom().getRoomNumber() : "?";
            sb.append(String.format("  • %s → %s (until %s) [%s]\n",
                    name, room,
                    b.getCheckOutDate() != null ? b.getCheckOutDate().format(DATE_FMT) : "?",
                    b.getBookingStatus()));
        });

        sb.append(String.format("Check-outs today: %d\n", checkOutsToday.size()));
        checkOutsToday.forEach(b -> {
            String name = b.getGuest() != null
                    ? b.getGuest().getFirstName() + " " + b.getGuest().getLastName() : "Unknown";
            String room = b.getRoom() != null ? "Room " + b.getRoom().getRoomNumber() : "?";
            sb.append(String.format("  • %s ← %s [%s]\n", name, room, b.getBookingStatus()));
        });

        // ── 4. Active bookings ──
        long activeCount = bookingRepo.countByBookingStatusIn(
                List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN));
        sb.append(String.format("\n=== ACTIVE BOOKINGS ===\nTotal active: %d\n", activeCount));

        // Show last 8 active bookings — uses existing idx_bookings_status index
        bookingRepo.findByBookingStatusIn(
                List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN))
                .stream()
                .sorted(Comparator.comparing(Booking::getCheckInDate,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(8)
                .forEach(b -> {
                    String name = b.getGuest() != null
                            ? b.getGuest().getFirstName() + " " + b.getGuest().getLastName() : "Unknown";
                    String room = b.getRoom() != null ? "Room " + b.getRoom().getRoomNumber() : "?";
                    sb.append(String.format("  • %s | %s | %s→%s | %s | €%.0f\n",
                            name, room,
                            b.getCheckInDate() != null ? b.getCheckInDate().format(DATE_FMT) : "?",
                            b.getCheckOutDate() != null ? b.getCheckOutDate().format(DATE_FMT) : "?",
                            b.getBookingStatus(),
                            b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO));
                });

        // ── 5. Revenue ──
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();

        BigDecimal revenueToday = paymentRepo.sumPaidBetween(startOfDay, startOfTomorrow);
        BigDecimal revenueMonth = paymentRepo.sumPaidBetween(startOfMonth, startOfTomorrow);

        sb.append(String.format("\n=== REVENUE ===\nToday: €%.2f | This month: €%.2f\n",
                revenueToday, revenueMonth));

        // ── 6. Guests ──
        long totalGuests = guestRepo.count();
        sb.append(String.format("\n=== GUESTS ===\nRegistered guests in system: %d\n", totalGuests));

        // ── 7. Housekeeping ──
        long pendingHk = housekeepingRepo.countByStatusIn(
                List.of(HousekeepingStatus.PENDING, HousekeepingStatus.IN_PROGRESS));
        sb.append(String.format("\n=== HOUSEKEEPING ===\nPending/In-progress tasks: %d\n", pendingHk));

        // ── 8. Maintenance ──
        long openMaint = maintenanceRepo.countByStatusIn(
                List.of(MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS));
        sb.append(String.format("\n=== MAINTENANCE ===\nOpen issues: %d\n", openMaint));

        // ── 9. Recent feedback ──
        long feedbackCount = feedbackRepo.count();
        sb.append(String.format("\n=== FEEDBACK & REVIEWS ===\nTotal reviews on record: %d\n", feedbackCount));

        // ── 10. Service requests ──
        long pendingSR = serviceRequestRepo.countByStatusIn(
                List.of(com.booksys.servicerequest.ServiceRequestStatus.PENDING,
                        com.booksys.servicerequest.ServiceRequestStatus.IN_PROGRESS));
        sb.append(String.format("\n=== SERVICE REQUESTS ===\nPending requests: %d\n", pendingSR));

        return sb.toString();
    }

    private String buildSystemPrompt(String snapshot, String knowledge) {
        StringBuilder p = new StringBuilder();
        p.append("You are LuxBot, the intelligent AI assistant for LuxStay Hotel Management System.\n");
        p.append("You have DIRECT ACCESS to the hotel's live database. The data below is pulled in real-time.\n");
        p.append("Use it to give precise, data-driven answers. Do not say you lack access to booking data.\n");
        p.append("IMPORTANT RULES:\n");
        p.append("• Only state prices, policies, or facts that appear in the data provided below.\n");
        p.append("• If a guest asks about something not in the data, say: 'I don't have that information — please contact reception.'\n");
        p.append("• Never invent room numbers, prices, booking references, or guest names.\n");
        p.append("• Be professional, concise, helpful. Answer in the language the user writes in.\n\n");
        p.append("── LIVE HOTEL DATA (as of now) ──\n");
        p.append(snapshot);
        p.append("\n── END OF LIVE DATA ──\n");
        if (!knowledge.isBlank()) {
            p.append("\n").append(knowledge).append("\n");
        }
        return p.toString();
    }

    // ─────────────────── Smart fallback (no API key) ──────────────────────

    private String smartFallback(String message, String snapshot, String knowledge) {
        String lower = message.toLowerCase();
        LocalDate today = LocalDate.now();

        // KB-first: if knowledge retrieval found relevant entries, answer directly from them
        if (knowledge != null && !knowledge.isBlank()) {
            String content = knowledge
                    .replace("=== Hotel Knowledge Base ===\n", "")
                    .replace("=== End of Knowledge Base ===\n", "")
                    .trim();
            if (!content.isBlank()) {
                return "Based on our hotel information:\n\n" + content;
            }
        }

        if (lower.contains("check-in") || lower.contains("checkin") || lower.contains("arriving")) {
            List<Booking> ins = bookingRepo.findByCheckInDateAndBookingStatusNot(today, BookingStatus.CANCELLED);
            if (ins.isEmpty()) return "No check-ins scheduled for today.";
            StringBuilder sb = new StringBuilder("Today's check-ins (" + ins.size() + "):\n");
            ins.forEach(b -> {
                String name = b.getGuest() != null
                        ? b.getGuest().getFirstName() + " " + b.getGuest().getLastName() : "Unknown";
                String room = b.getRoom() != null ? "Room " + b.getRoom().getRoomNumber() : "?";
                sb.append("• ").append(name).append(" → ").append(room).append("\n");
            });
            return sb.toString().trim();
        }

        if (lower.contains("check-out") || lower.contains("checkout") || lower.contains("departing")) {
            List<Booking> outs = bookingRepo.findByCheckOutDateAndBookingStatusNot(today, BookingStatus.CANCELLED);
            if (outs.isEmpty()) return "No check-outs scheduled for today.";
            StringBuilder sb = new StringBuilder("Today's check-outs (" + outs.size() + "):\n");
            outs.forEach(b -> {
                String name = b.getGuest() != null
                        ? b.getGuest().getFirstName() + " " + b.getGuest().getLastName() : "Unknown";
                String room = b.getRoom() != null ? "Room " + b.getRoom().getRoomNumber() : "?";
                sb.append("• ").append(name).append(" ← ").append(room).append("\n");
            });
            return sb.toString().trim();
        }

        if (lower.contains("room") && (lower.contains("free") || lower.contains("available") || lower.contains("empty"))) {
            long free = roomRepo.findByRoomStatus(RoomStatus.FREE).size();
            long total = roomRepo.count();
            return String.format("Currently %d of %d rooms are free and available for booking.", free, total);
        }

        if (lower.contains("revenue") || lower.contains("income") || lower.contains("money") || lower.contains("earn")) {
            LocalDateTime start = today.atStartOfDay();
            LocalDateTime end   = today.plusDays(1).atStartOfDay();
            LocalDateTime mStart = today.withDayOfMonth(1).atStartOfDay();
            BigDecimal daily = paymentRepo.sumPaidBetween(start, end);
            BigDecimal monthly = paymentRepo.sumPaidBetween(mStart, end);
            return String.format("Revenue today: €%.2f | This month so far: €%.2f", daily, monthly);
        }

        if (lower.contains("booking") || lower.contains("reservation")) {
            long active = bookingRepo.countByBookingStatusIn(
                    List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN));
            long total = bookingRepo.count();
            return String.format("Active bookings: %d | Total all-time: %d", active, total);
        }

        if (lower.contains("guest") || lower.contains("customer")) {
            long count = guestRepo.count();
            return String.format("There are %d registered guests in the system.", count);
        }

        if (lower.contains("housekeeping") || lower.contains("cleaning") || lower.contains("housekeeper")) {
            long pending = housekeepingRepo.countByStatusIn(
                    List.of(HousekeepingStatus.PENDING, HousekeepingStatus.IN_PROGRESS));
            return String.format("Housekeeping: %d tasks pending or in progress.", pending);
        }

        if (lower.contains("maintenance") || lower.contains("repair") || lower.contains("broken")) {
            long open = maintenanceRepo.countByStatusIn(
                    List.of(MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS));
            return String.format("Maintenance: %d open issues.", open);
        }

        if (lower.contains("stat") || lower.contains("overview") || lower.contains("summary")
                || lower.contains("dashboard") || lower.contains("status")) {
            long free = roomRepo.findByRoomStatus(RoomStatus.FREE).size();
            long occupied = roomRepo.findByRoomStatus(RoomStatus.OCCUPIED).size();
            long active = bookingRepo.countByBookingStatusIn(
                    List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN));
            long guests = guestRepo.count();
            LocalDateTime start = today.atStartOfDay();
            BigDecimal daily = paymentRepo.sumPaidBetween(start, today.plusDays(1).atStartOfDay());
            return String.format(
                    "Hotel status for %s:\n• Rooms: %d free / %d occupied\n• Active bookings: %d\n• Registered guests: %d\n• Revenue today: €%.2f",
                    today.format(DATE_FMT), free, occupied, active, guests, daily);
        }

        // Generic — summarise current state
        long free = roomRepo.findByRoomStatus(RoomStatus.FREE).size();
        long active = bookingRepo.countByBookingStatusIn(
                List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN));
        return String.format(
                "I'm LuxBot with live access to your hotel data. Right now: %d rooms free, %d active bookings. " +
                "Ask me about check-ins, check-outs, revenue, rooms, guests, housekeeping, or maintenance.",
                free, active);
    }

    public record ChatRequest(String message, String sessionId, String userEmail) {}
}
