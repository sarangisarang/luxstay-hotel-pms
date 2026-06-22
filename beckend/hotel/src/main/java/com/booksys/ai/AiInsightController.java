package com.booksys.ai;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.feedbackreview.FeedbackReview;
import com.booksys.feedbackreview.FeedbackReviewRepository;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import com.booksys.housekeeping.HousekeepingRepository;
import com.booksys.housekeeping.HousekeepingStatus;
import com.booksys.maintenance.MaintenanceRepository;
import com.booksys.maintenance.MaintenanceStatus;
import com.booksys.payment.PaymentRepository;
import com.booksys.room.Room;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import com.booksys.servicerequest.ServiceRequestRepository;
import com.booksys.servicerequest.ServiceRequestStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * AI-powered insight endpoints — one per major section of the hotel app.
 * Each endpoint builds a live DB snapshot, sends it to Claude, and returns
 * an actionable insight paragraph. Falls back to rule-based analysis when
 * no API key is configured.
 */
@Slf4j
@RestController
@RequestMapping("/api/ai/insights")
@RequiredArgsConstructor
public class AiInsightController {

    private final BookingRepository       bookingRepo;
    private final RoomRepository          roomRepo;
    private final GuestRepository         guestRepo;
    private final PaymentRepository       paymentRepo;
    private final HousekeepingRepository  housekeepingRepo;
    private final MaintenanceRepository   maintenanceRepo;
    private final FeedbackReviewRepository feedbackRepo;
    private final ServiceRequestRepository serviceReqRepo;

    @Value("${ai.groq.api-key:}")
    private String apiKey;

    private static final String GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";
    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("dd MMM yyyy");

    // ─────────────────────────────────────────────────────────────────────
    // 1.  DASHBOARD — morning briefing + priority action list
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/dashboard")
    public Map<String, String> dashboardInsight() {
        LocalDate today = LocalDate.now();
        long free     = roomRepo.findByRoomStatus(RoomStatus.FREE).size();
        long occupied = roomRepo.findByRoomStatus(RoomStatus.OCCUPIED).size();
        long reserved = roomRepo.findByRoomStatus(RoomStatus.RESERVED).size();
        long maint    = roomRepo.findByRoomStatus(RoomStatus.MAINTENANCE).size();
        long total    = roomRepo.count();

        long checkInsToday  = bookingRepo.countByCheckInDateAndBookingStatusNot(today, BookingStatus.CANCELLED);
        long checkOutsToday = bookingRepo.countByCheckOutDateAndBookingStatusNot(today, BookingStatus.CANCELLED);
        long active   = bookingRepo.countByBookingStatusIn(List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN));
        long pendingHk = housekeepingRepo.countByStatusIn(List.of(HousekeepingStatus.PENDING, HousekeepingStatus.IN_PROGRESS));
        long openMaint = maintenanceRepo.countByStatusIn(List.of(MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS));
        long pendingSR = serviceReqRepo.countByStatusIn(List.of(ServiceRequestStatus.PENDING, ServiceRequestStatus.IN_PROGRESS));

        BigDecimal revToday = paymentRepo.sumPaidBetween(today.atStartOfDay(), today.plusDays(1).atStartOfDay());
        BigDecimal revMonth = paymentRepo.sumPaidBetween(today.withDayOfMonth(1).atStartOfDay(), today.plusDays(1).atStartOfDay());
        double occupancyPct = total > 0 ? (occupied + reserved) * 100.0 / total : 0;

        String context = String.format(
            "Hotel daily briefing for %s.\n" +
            "Rooms: %d total | %d free | %d occupied | %d reserved | %d maintenance. Occupancy: %.0f%%.\n" +
            "Today: %d check-ins, %d check-outs. Active bookings: %d.\n" +
            "Revenue today: €%.2f | This month: €%.2f.\n" +
            "Housekeeping tasks pending/in-progress: %d.\n" +
            "Maintenance open issues: %d.\n" +
            "Service requests pending/in-progress: %d.",
            today.format(DF), total, free, occupied, reserved, maint, occupancyPct,
            checkInsToday, checkOutsToday, active, revToday, revMonth,
            pendingHk, openMaint, pendingSR);

        String prompt = "You are a hotel operations AI. Based on the data below, write a concise morning briefing " +
            "(3–5 bullet points) with the top priority actions for today. Be direct and specific. Use bullet points (•).\n\n" + context;

        String insight = callClaude(prompt, 350);
        if (insight == null) insight = fallbackDashboard(free, occupied, total, checkInsToday, checkOutsToday, pendingHk, openMaint, revToday);
        return Map.of("insight", insight, "context", context);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2.  BOOKINGS — anomaly detection + trend analysis
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/bookings")
    public Map<String, String> bookingsInsight() {
        LocalDate today = LocalDate.now();
        long total     = bookingRepo.count();
        long confirmed = bookingRepo.countByBookingStatusIn(List.of(BookingStatus.CONFIRMED));
        long pending   = bookingRepo.countByBookingStatusIn(List.of(BookingStatus.PENDING));
        long checkedIn = bookingRepo.countByBookingStatusIn(List.of(BookingStatus.CHECKED_IN));
        long cancelled = bookingRepo.countByBookingStatusIn(List.of(BookingStatus.CANCELLED));
        long overdue   = bookingRepo.findOverdueBookings(today).size();

        long next7days = bookingRepo.countByCheckInDateBetweenAndBookingStatusNot(today, today.plusDays(7), BookingStatus.CANCELLED);
        BigDecimal avg = bookingRepo.avgTotalAmountExcluding(BookingStatus.CANCELLED);

        String context = String.format(
            "Booking statistics:\n" +
            "Total bookings: %d | Confirmed: %d | Pending: %d | Checked-in: %d | Cancelled: %d.\n" +
            "Overdue (past check-out, not closed): %d.\n" +
            "Arriving in next 7 days: %d.\n" +
            "Average booking value: €%.2f.", total, confirmed, pending, checkedIn, cancelled, overdue, next7days, avg);

        String prompt = "You are a hotel revenue analyst. Analyse these booking stats and give 3–4 bullet insights: " +
            "identify risks (overdue, high pending), highlight positives, and give 1–2 recommendations.\n\n" + context;

        String insight = callClaude(prompt, 300);
        if (insight == null) insight = fallbackBookings(pending, overdue, next7days, avg);
        return Map.of("insight", insight);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3.  GUEST PROFILE — personalised guest analysis
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/guest/{id}")
    public Map<String, String> guestInsight(@PathVariable UUID id) {
        Guest guest = guestRepo.findById(id).orElse(null);
        if (guest == null) return Map.of("insight", "Guest not found.");

        List<Booking> bookings = bookingRepo.findByGuestId(id);
        long stays = bookings.stream().filter(b -> b.getBookingStatus() != BookingStatus.CANCELLED).count();
        long cancelled = bookings.stream().filter(b -> b.getBookingStatus() == BookingStatus.CANCELLED).count();

        BigDecimal totalSpent = bookings.stream()
                .filter(b -> b.getTotalAmount() != null && b.getBookingStatus() != BookingStatus.CANCELLED)
                .map(Booking::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        String lastRoom = bookings.stream()
                .filter(b -> b.getRoom() != null && b.getCheckInDate() != null)
                .max(Comparator.comparing(Booking::getCheckInDate))
                .map(b -> b.getRoom().getRoomType() != null ? b.getRoom().getRoomType().getName() : "Room " + b.getRoom().getRoomNumber())
                .orElse("N/A");

        List<FeedbackReview> reviews = feedbackRepo.findByGuestId(id);
        double avgRating = reviews.stream().mapToInt(FeedbackReview::getRating).average().orElse(0);

        String context = String.format(
            "Guest: %s %s | Email: %s | Phone: %s.\n" +
            "Total stays: %d | Cancelled: %d | Total spent: €%.2f.\n" +
            "Last room type: %s. Average review rating given: %.1f/5.",
            guest.getFirstName(), guest.getLastName(), guest.getEmail(),
            guest.getPhone() != null ? guest.getPhone() : "N/A",
            stays, cancelled, totalSpent, lastRoom, avgRating);

        String prompt = "You are a hotel CRM analyst. Summarise this guest's profile in 3–4 bullet points: " +
            "loyalty tier (based on stays/spend), preferences (inferred from room history), risk factors (cancellations), " +
            "and 1 personalised upsell suggestion.\n\n" + context;

        String insight = callClaude(prompt, 280);
        if (insight == null) insight = fallbackGuest(guest.getFirstName(), stays, totalSpent, lastRoom, avgRating);
        return Map.of("insight", insight);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4.  ROOM RECOMMENDATION — given dates + guests, suggest best rooms
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/room-suggest")
    public Map<String, Object> roomSuggest(
            @RequestParam(required = false) String checkIn,
            @RequestParam(required = false) String checkOut,
            @RequestParam(defaultValue = "1") int guests) {

        LocalDate from = checkIn  != null ? LocalDate.parse(checkIn)  : LocalDate.now();
        LocalDate to   = checkOut != null ? LocalDate.parse(checkOut) : from.plusDays(1);

        List<Room> freeRooms = roomRepo.findByRoomStatusNot(RoomStatus.MAINTENANCE).stream()
                .filter(r -> bookingRepo.findOverlapping(r.getId(), from, to, BookingStatus.CANCELLED).isEmpty())
                .filter(r -> r.getRoomType() != null && r.getRoomType().getCapacity() >= guests)
                .toList();

        if (freeRooms.isEmpty()) {
            return Map.of("insight", "No rooms available for the selected dates and guest count.", "rooms", List.of());
        }

        String roomList = freeRooms.stream().map(r -> String.format(
            "%s (Room %d) — €%.0f/night, capacity %d",
            r.getRoomType().getName(), r.getRoomNumber(),
            r.getRoomType().getPricePerNight() != null ? r.getRoomType().getPricePerNight() : BigDecimal.ZERO,
            r.getRoomType().getCapacity()
        )).collect(Collectors.joining("\n"));

        String context = String.format(
            "Guest wants to stay %s to %s (%d night(s)), party of %d.\nAvailable rooms:\n%s",
            from.format(DF), to.format(DF),
            java.time.temporal.ChronoUnit.DAYS.between(from, to),
            guests, roomList);

        String prompt = "You are a hotel concierge. Based on the available rooms and guest count, " +
            "recommend the best 2–3 options with a short reason for each. Be friendly and persuasive. " +
            "Format: • RoomType (Room X) — reason\n\n" + context;

        String insight = callClaude(prompt, 250);
        if (insight == null) {
            insight = freeRooms.stream().limit(3)
                .map(r -> String.format("• %s (Room %d) — €%.0f/night, fits %d guests",
                    r.getRoomType().getName(), r.getRoomNumber(),
                    r.getRoomType().getPricePerNight() != null ? r.getRoomType().getPricePerNight() : BigDecimal.ZERO,
                    r.getRoomType().getCapacity()))
                .collect(Collectors.joining("\n"));
        }

        List<Map<String, Object>> roomData = freeRooms.stream().map(r -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("id",         r.getId());
            m.put("roomNumber", r.getRoomNumber());
            m.put("typeName",   r.getRoomType().getName());
            m.put("price",      r.getRoomType().getPricePerNight());
            m.put("capacity",   r.getRoomType().getCapacity());
            return m;
        }).toList();

        return Map.of("insight", insight, "rooms", roomData);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5.  REVENUE / KPI — trend analysis + pricing recommendations
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/revenue")
    public Map<String, String> revenueInsight() {
        LocalDate today = LocalDate.now();
        long totalRooms = roomRepo.count();

        StringBuilder monthly = new StringBuilder();
        BigDecimal[] last3 = new BigDecimal[3];
        for (int i = 2; i >= 0; i--) {
            LocalDate m = today.minusMonths(i);
            BigDecimal rev = paymentRepo.sumPaidBetween(
                m.withDayOfMonth(1).atStartOfDay(),
                m.withDayOfMonth(m.lengthOfMonth()).plusDays(1).atStartOfDay());
            monthly.append(String.format("%s: €%.2f\n", m.format(DateTimeFormatter.ofPattern("MMM yyyy")), rev));
            last3[2 - i] = rev;
        }
        BigDecimal revToday = paymentRepo.sumPaidBetween(today.atStartOfDay(), today.plusDays(1).atStartOfDay());
        BigDecimal revMonth = paymentRepo.sumPaidBetween(today.withDayOfMonth(1).atStartOfDay(), today.plusDays(1).atStartOfDay());

        long occupied = roomRepo.findByRoomStatus(RoomStatus.OCCUPIED).size()
                      + roomRepo.findByRoomStatus(RoomStatus.RESERVED).size();
        double occPct = totalRooms > 0 ? occupied * 100.0 / totalRooms : 0;

        String context = String.format(
            "Revenue trend (last 3 months):\n%s" +
            "Today: €%.2f | This month so far: €%.2f.\n" +
            "Current occupancy: %.0f%% (%d of %d rooms).\n",
            monthly, revToday, revMonth, occPct, occupied, totalRooms);

        String prompt = "You are a hotel revenue manager. Analyse the revenue trend and occupancy below. " +
            "Give 3–4 bullet insights: trend direction, performance vs typical, " +
            "and 2 concrete recommendations (e.g. pricing, promotions, channel strategy).\n\n" + context;

        String insight = callClaude(prompt, 320);
        if (insight == null) insight = fallbackRevenue(last3, revMonth, occPct);
        return Map.of("insight", insight);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 6.  OPERATIONS — housekeeping + maintenance + service requests
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/operations")
    public Map<String, String> operationsInsight() {
        long hkPending    = housekeepingRepo.countByStatus(HousekeepingStatus.PENDING);
        long hkInProgress = housekeepingRepo.countByStatus(HousekeepingStatus.IN_PROGRESS);
        long hkDone       = housekeepingRepo.countByStatus(HousekeepingStatus.DONE);
        long maintOpen    = maintenanceRepo.countByStatus(MaintenanceStatus.OPEN);
        long maintInProg  = maintenanceRepo.countByStatus(MaintenanceStatus.IN_PROGRESS);
        long srPending    = serviceReqRepo.countByStatus(ServiceRequestStatus.PENDING);
        long srInProg     = serviceReqRepo.countByStatus(ServiceRequestStatus.IN_PROGRESS);

        LocalDate today   = LocalDate.now();
        long checkInsToday = bookingRepo.countByCheckInDateAndBookingStatusNot(today, BookingStatus.CANCELLED);
        long freeRooms = roomRepo.findByRoomStatus(RoomStatus.FREE).size();

        String context = String.format(
            "Operations status for %s:\n" +
            "Housekeeping — Pending: %d | In progress: %d | Done today: %d.\n" +
            "Maintenance — Open: %d | In progress: %d.\n" +
            "Service requests — Pending: %d | In progress: %d.\n" +
            "Incoming check-ins today: %d. Free rooms to prepare: %d.",
            today.format(DF), hkPending, hkInProgress, hkDone,
            maintOpen, maintInProg, srPending, srInProg, checkInsToday, freeRooms);

        String prompt = "You are a hotel operations manager. Review the operations data and give " +
            "3–4 bullet priority actions for the team today. Focus on urgent items first.\n\n" + context;

        String insight = callClaude(prompt, 300);
        if (insight == null) insight = fallbackOperations(hkPending, maintOpen, srPending, checkInsToday);
        return Map.of("insight", insight);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 7. FEEDBACK ANALYSIS — sentiment + patterns
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/feedback")
    public Map<String, String> feedbackInsight() {
        List<FeedbackReview> reviews = feedbackRepo.findAll();
        if (reviews.isEmpty()) return Map.of("insight", "No reviews on record yet.");

        double avgRating = reviews.stream().mapToInt(FeedbackReview::getRating).average().orElse(0);
        long positive = reviews.stream().filter(r -> r.getRating() >= 4).count();
        long neutral  = reviews.stream().filter(r -> r.getRating() == 3).count();
        long negative = reviews.stream().filter(r -> r.getRating() <= 2).count();

        String recentComments = reviews.stream()
                .sorted(Comparator.comparingInt(FeedbackReview::getRating))
                .limit(5)
                .map(r -> String.format("Rating %d: %s", r.getRating(),
                        r.getComment() != null ? r.getComment().substring(0, Math.min(80, r.getComment().length())) : "(no comment)"))
                .collect(Collectors.joining("\n"));

        String context = String.format(
            "Guest feedback summary:\nTotal reviews: %d | Average rating: %.1f/5.\n" +
            "Positive (4–5 stars): %d | Neutral (3): %d | Negative (1–2): %d.\n\n" +
            "Recent lower-rated reviews:\n%s",
            reviews.size(), avgRating, positive, neutral, negative, recentComments);

        String prompt = "You are a hotel quality manager. Analyse the guest feedback and provide " +
            "3–4 bullet insights: overall sentiment, key recurring issues, strengths to maintain, and 1 improvement priority.\n\n" + context;

        String insight = callClaude(prompt, 300);
        if (insight == null) insight = fallbackFeedback(avgRating, positive, negative, reviews.size());
        return Map.of("insight", insight);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 8. GUEST ANALYTICS — LOS, lead time, segmentation insight
    // ─────────────────────────────────────────────────────────────────────
    @GetMapping("/guests")
    public Map<String, String> guestAnalyticsInsight() {
        List<Booking> bookings = bookingRepo.findActiveWithDates(BookingStatus.CANCELLED);

        if (bookings.isEmpty()) return Map.of("insight", "No booking data available for guest analysis.");

        double avgLos = bookings.stream()
                .mapToLong(b -> java.time.temporal.ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                .average().orElse(0);
        double avgLead = bookings.stream()
                .filter(b -> b.getCreatedAt() != null)
                .mapToLong(b -> Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(
                        b.getCreatedAt().toLocalDate(), b.getCheckInDate())))
                .average().orElse(0);

        long sameDayBookings = bookings.stream()
                .filter(b -> b.getCreatedAt() != null && b.getCreatedAt().toLocalDate().equals(b.getCheckInDate()))
                .count();
        long longStay = bookings.stream()
                .filter(b -> java.time.temporal.ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()) >= 7)
                .count();

        Map<String, Long> countries = new java.util.LinkedHashMap<>();
        bookings.stream()
                .filter(b -> b.getGuest() != null && b.getGuest().getCountry() != null && !b.getGuest().getCountry().isBlank())
                .collect(java.util.stream.Collectors.groupingBy(b -> b.getGuest().getCountry(), java.util.stream.Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .forEach(e -> countries.put(e.getKey(), e.getValue()));

        String context = String.format(
            "Guest analytics summary for %d bookings:\n" +
            "Average length of stay: %.1f nights | Average lead time: %.1f days\n" +
            "Same-day bookings: %d (%.1f%%) | Long stays (7+ nights): %d (%.1f%%)\n" +
            "Top origin countries: %s",
            bookings.size(), avgLos, avgLead,
            sameDayBookings, sameDayBookings * 100.0 / bookings.size(),
            longStay, longStay * 100.0 / bookings.size(),
            countries);

        String prompt = "You are a hotel revenue and CRM specialist. Analyse the guest booking patterns and provide " +
            "3–4 actionable bullet insights: dominant guest segment, booking behaviour patterns, " +
            "CRM opportunities, and one tactical recommendation.\n\n" + context;

        String insight = callClaude(prompt, 300);
        if (insight == null) insight = String.format(
            "• Average stay is %.1f nights — %.0f%% of bookings are short stays (1–2 nights).\n" +
            "• Average booking lead time is %.0f days — consider a last-minute rate strategy for the %.1f%% who book same-day.\n" +
            "• %.1f%% of guests book 7+ nights — an extended-stay package could increase RevPAR.\n" +
            "• Top guest origin: %s — ensure marketing materials and staff greetings reflect top markets.",
            avgLos,
            bookings.stream().filter(b -> java.time.temporal.ChronoUnit.DAYS.between(
                b.getCheckInDate(), b.getCheckOutDate()) <= 2).count() * 100.0 / bookings.size(),
            avgLead, sameDayBookings * 100.0 / bookings.size(),
            longStay * 100.0 / bookings.size(),
            countries.isEmpty() ? "Unknown" : countries.keySet().iterator().next());

        return Map.of("insight", insight);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Groq API call helper (OpenAI-compatible)
    // ─────────────────────────────────────────────────────────────────────
    private String callClaude(String prompt, int maxTokens) {
        if (apiKey == null || apiKey.isBlank()) return null;
        try {
            Map<String, Object> body = Map.of(
                "model",       GROQ_MODEL,
                "messages",    List.of(Map.of("role", "user", "content", prompt)),
                "max_tokens",  maxTokens,
                "temperature", 0.4
            );

            WebClient client = WebClient.builder()
                    .baseUrl(GROQ_URL)
                    .defaultHeader("Authorization", "Bearer " + apiKey)
                    .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .build();

            @SuppressWarnings("unchecked")
            Map<String, Object> resp = client.post().bodyValue(body).retrieve()
                    .bodyToMono(Map.class).block();
            if (resp == null) return null;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.get("choices");
            if (choices == null || choices.isEmpty()) return null;
            @SuppressWarnings("unchecked")
            Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
            return msg != null ? (String) msg.get("content") : null;
        } catch (Exception e) {
            log.error("AI insight Groq error: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Rule-based fallbacks
    // ─────────────────────────────────────────────────────────────────────
    private String fallbackDashboard(long free, long occupied, long total, long in, long out,
                                     long hk, long maint, BigDecimal rev) {
        double occ = total > 0 ? (occupied * 100.0 / total) : 0;
        return String.format(
            "• Occupancy: %.0f%% (%d/%d rooms). %s\n" +
            "• Today: %d check-ins and %d check-outs to process.\n" +
            "• Housekeeping: %d tasks need attention before new arrivals.\n" +
            "• Maintenance: %d open issues — prioritise rooms due for check-in.\n" +
            "• Revenue today: €%.2f",
            occ, occupied, total, occ >= 80 ? "Excellent!" : occ >= 50 ? "Good pace." : "Low — consider promotions.",
            in, out, hk, maint, rev);
    }

    private String fallbackBookings(long pending, long overdue, long next7, BigDecimal avg) {
        return String.format(
            "• %d pending bookings require confirmation — follow up today.\n" +
            "• %d overdue bookings detected — update status (check-out or no-show).\n" +
            "• %d arrivals expected in the next 7 days — ensure rooms are ready.\n" +
            "• Average booking value: €%.2f", pending, overdue, next7, avg);
    }

    private String fallbackGuest(String name, long stays, BigDecimal spent, String lastRoom, double rating) {
        String loyalty = stays >= 10 ? "VIP Guest" : stays >= 5 ? "Returning Guest" : stays >= 2 ? "Regular" : "New Guest";
        return String.format(
            "• %s is a %s with %d confirmed stay(s) and €%.2f total spend.\n" +
            "• Preferred room type: %s — offer similar or upgraded options.\n" +
            "• Review average given: %.1f/5 — %s\n" +
            "• Upsell opportunity: complimentary upgrade or loyalty points offer.",
            name, loyalty, stays, spent, lastRoom, rating,
            rating >= 4 ? "satisfied guest, good candidate for loyalty programme." : "monitor experience closely.");
    }

    private String fallbackRevenue(BigDecimal[] last3, BigDecimal thisMonth, double occ) {
        String trend = last3[2].compareTo(last3[0]) > 0 ? "upward trend" : "declining trend";
        return String.format(
            "• Revenue shows a %s over the last 3 months.\n" +
            "• This month so far: €%.2f.\n" +
            "• Current occupancy: %.0f%% — %s\n" +
            "• Recommendation: %s",
            trend, thisMonth, occ,
            occ >= 80 ? "strong position." : "room to grow.",
            occ < 60 ? "Consider promotional rates or OTA channel push for the next 2 weeks." :
                       "Maintain current pricing — consider slight rate increase on high-demand dates.");
    }

    private String fallbackOperations(long hk, long maint, long sr, long checkIns) {
        return String.format(
            "• Priority: prepare %d rooms for today's %d arriving guests.\n" +
            "• Housekeeping: %d tasks pending — assign to available staff immediately.\n" +
            "• Maintenance: %d open issues — check if any affect arrival rooms.\n" +
            "• Service requests: %d pending — notify relevant department.",
            checkIns, checkIns, hk, maint, sr);
    }

    private String fallbackFeedback(double avg, long pos, long neg, int total) {
        return String.format(
            "• Overall sentiment: %.1f/5 based on %d reviews — %s\n" +
            "• %d positive reviews (4–5 stars) — identify what guests love and maintain it.\n" +
            "• %d negative reviews — review comments and address root causes.\n" +
            "• Recommendation: %s",
            avg, total, avg >= 4 ? "Excellent guest satisfaction." : avg >= 3 ? "Satisfactory." : "Needs urgent attention.",
            pos, neg, neg > 0 ? "Follow up personally with dissatisfied guests and resolve issues." :
                                "Keep up the excellent standards.");
    }
}
