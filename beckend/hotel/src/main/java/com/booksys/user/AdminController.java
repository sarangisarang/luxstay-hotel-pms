package com.booksys.user;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.guest.GuestRepository;
import com.booksys.payment.Payment;
import com.booksys.payment.PaymentRepository;
import com.booksys.payment.PaymentStatus;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final BookingRepository bookingRepository;
    private final GuestRepository guestRepository;
    private final RoomRepository roomRepository;
    private final PaymentRepository paymentRepository;

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsResponse> getStats() {
        long totalBookings = bookingRepository.count();
        long totalGuests   = guestRepository.count();

        long occupiedRooms = roomRepository.findByRoomStatus(RoomStatus.OCCUPIED).size();
        long freeRooms     = roomRepository.findByRoomStatus(RoomStatus.FREE).size();

        long activeBookings = bookingRepository.countByBookingStatusIn(
                List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN));

        LocalDate today = LocalDate.now();
        YearMonth thisMonth = YearMonth.now();

        BigDecimal revenueToday = paymentRepository.sumPaidBetween(
                today.atStartOfDay(), today.plusDays(1).atStartOfDay());
        BigDecimal revenueMonth = paymentRepository.sumPaidBetween(
                thisMonth.atDay(1).atStartOfDay(), thisMonth.atEndOfMonth().plusDays(1).atStartOfDay());

        return ResponseEntity.ok(new AdminStatsResponse(
                totalBookings, activeBookings, totalGuests,
                occupiedRooms, freeRooms, revenueToday, revenueMonth));
    }

    /** Monthly revenue for the last 12 months, newest last. */
    @GetMapping("/monthly-revenue")
    public ResponseEntity<List<Map<String, Object>>> monthlyRevenue() {
        YearMonth now = YearMonth.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM yyyy");
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            BigDecimal rev = paymentRepository.sumPaidBetween(
                    ym.atDay(1).atStartOfDay(), ym.atEndOfMonth().plusDays(1).atStartOfDay());
            result.add(Map.of("month", ym.format(fmt), "revenue", rev));
        }
        return ResponseEntity.ok(result);
    }

    /** Booking counts by status. */
    @GetMapping("/booking-status-summary")
    public ResponseEntity<Map<String, Long>> bookingStatusSummary() {
        Map<String, Long> summary = new LinkedHashMap<>();
        for (BookingStatus s : BookingStatus.values()) {
            long count = bookingRepository.countByBookingStatusIn(List.of(s));
            if (count > 0) summary.put(s.name(), count);
        }
        return ResponseEntity.ok(summary);
    }

    /**
     * Hotel performance KPIs: RevPAR, ADR, occupancy % per month for the last 12 months.
     * RevPAR = Total Revenue / Total Available Room-Nights
     * ADR    = Total Revenue / Rooms Sold (occupied nights)
     * Occupancy % = Rooms Sold / Available Room-Nights * 100
     */
    @GetMapping("/kpi")
    public ResponseEntity<List<Map<String, Object>>> kpiMetrics() {
        YearMonth now = YearMonth.now();
        long totalRooms = roomRepository.count();

        // Load bookings overlapping the full 12-month window once — avoids 12 separate findAll() scans.
        LocalDate windowStart = now.minusMonths(11).atDay(1);
        LocalDate windowEnd   = now.atEndOfMonth();
        List<Booking> windowBookings = bookingRepository.findAllOverlapping(windowStart, windowEnd.plusDays(1))
                .stream()
                .filter(b -> b.getBookingStatus() != BookingStatus.CANCELLED
                        && b.getCheckInDate() != null && b.getCheckOutDate() != null)
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();

        for (int i = 11; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            LocalDate monthStart = ym.atDay(1);
            LocalDate monthEnd   = ym.atEndOfMonth();
            int daysInMonth      = ym.lengthOfMonth();
            long availableNights = totalRooms * daysInMonth;

            BigDecimal revenue = paymentRepository.sumPaidBetween(
                    monthStart.atStartOfDay(), monthEnd.plusDays(1).atStartOfDay());

            long occupiedNights = windowBookings.stream()
                    .filter(b -> !b.getCheckInDate().isAfter(monthEnd)
                            && !b.getCheckOutDate().isBefore(monthStart))
                    .mapToLong(b -> {
                        LocalDate s = b.getCheckInDate().isBefore(monthStart) ? monthStart : b.getCheckInDate();
                        LocalDate e = b.getCheckOutDate().isAfter(monthEnd) ? monthEnd.plusDays(1) : b.getCheckOutDate();
                        return ChronoUnit.DAYS.between(s, e);
                    })
                    .sum();

            BigDecimal avNights = BigDecimal.valueOf(availableNights);
            BigDecimal occNights = BigDecimal.valueOf(occupiedNights);

            BigDecimal revpar = availableNights > 0
                    ? revenue.divide(avNights, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal adr = occupiedNights > 0
                    ? revenue.divide(occNights, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal occupancy = availableNights > 0
                    ? occNights.multiply(BigDecimal.valueOf(100))
                               .divide(avNights, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            result.add(Map.of(
                    "month",          ym.format(DateTimeFormatter.ofPattern("MMM yyyy")),
                    "revenue",        revenue,
                    "revpar",         revpar,
                    "adr",            adr,
                    "occupancyPct",   occupancy,
                    "occupiedNights", occupiedNights,
                    "availableNights", availableNights
            ));
        }

        return ResponseEntity.ok(result);
    }

    /** Daily financial reconciliation: all payments for a specific date. */
    @GetMapping("/reconciliation")
    public ResponseEntity<Map<String, Object>> reconciliation(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate target = date != null ? date : LocalDate.now();
        java.time.LocalDateTime from = target.atStartOfDay();
        java.time.LocalDateTime to   = target.plusDays(1).atStartOfDay();

        List<Payment> payments = paymentRepository.findByDateRange(from, to);

        BigDecimal paidTotal    = BigDecimal.ZERO;
        BigDecimal pendingTotal = BigDecimal.ZERO;
        long paidCount    = 0;
        long pendingCount = 0;

        Map<String, BigDecimal> byMethod = new LinkedHashMap<>();
        for (Payment p : payments) {
            String method = p.getPaymentMethod() != null ? p.getPaymentMethod() : "UNKNOWN";
            BigDecimal amt = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
            if (p.getStatus() == PaymentStatus.PAID) {
                paidTotal = paidTotal.add(amt);
                paidCount++;
                byMethod.merge(method, amt, BigDecimal::add);
            } else if (p.getStatus() == PaymentStatus.PENDING) {
                pendingTotal = pendingTotal.add(amt);
                pendingCount++;
            }
        }

        List<Map<String, Object>> lines = new ArrayList<>();
        for (Payment p : payments) {
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("paymentId",  p.getId());
            line.put("bookingId",  p.getBooking() != null ? p.getBooking().getId() : null);
            line.put("guestName",  p.getGuestName());
            line.put("amount",     p.getAmount());
            line.put("method",     p.getPaymentMethod());
            line.put("status",     p.getStatus());
            line.put("time",       p.getPaymentDate());
            lines.add(line);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date",         target.toString());
        result.put("paidTotal",    paidTotal);
        result.put("pendingTotal", pendingTotal);
        result.put("paidCount",    paidCount);
        result.put("pendingCount", pendingCount);
        result.put("byMethod",     byMethod);
        result.put("lines",        lines);
        return ResponseEntity.ok(result);
    }

    /** 30-day booking forecast: confirmed/pending bookings per day from today. */
    @GetMapping("/forecast")
    public ResponseEntity<List<Map<String, Object>>> forecast() {
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> result = new ArrayList<>();

        List<Booking> upcoming = bookingRepository.findByBookingStatusIn(
                List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN));

        for (int d = 0; d < 30; d++) {
            LocalDate day = today.plusDays(d);
            long occupied = upcoming.stream()
                    .filter(b -> !b.getCheckInDate().isAfter(day) && b.getCheckOutDate().isAfter(day))
                    .count();
            long checkIns = upcoming.stream()
                    .filter(b -> b.getCheckInDate().equals(day))
                    .count();
            long checkOuts = upcoming.stream()
                    .filter(b -> b.getCheckOutDate().equals(day))
                    .count();

            result.add(Map.of(
                    "date",      day.toString(),
                    "occupied",  occupied,
                    "checkIns",  checkIns,
                    "checkOuts", checkOuts
            ));
        }
        return ResponseEntity.ok(result);
    }

    /**
     * PACE Report — booking velocity for the next 90 days.
     * Compares bookings made this week vs. bookings made in the equivalent week last year.
     * Returns: date, roomsOnBooks (current), roomsOnBooksLy (last year),
     *          pickupThisWeek (bookings created in last 7 days for that date),
     *          occupancyPct, occupancyPctLy.
     */
    @GetMapping("/pace")
    public ResponseEntity<List<Map<String, Object>>> paceReport() {
        LocalDate today = LocalDate.now();
        LocalDate lastYear = today.minusYears(1);
        long totalRooms = Math.max(roomRepository.count(), 1);

        // Load non-cancelled bookings with dates once — used for all 90 day iterations.
        List<Booking> all = bookingRepository.findActiveWithDates(BookingStatus.CANCELLED);

        // Bookings created in last 7 days (pickup window)
        java.time.LocalDateTime pickupFrom = today.minusDays(7).atStartOfDay();

        List<Map<String, Object>> result = new ArrayList<>();
        for (int d = 0; d < 90; d++) {
            LocalDate futureDate = today.plusDays(d);
            LocalDate futureDateLy = lastYear.plusDays(d);

            // Current year — bookings on books for futureDate
            long onBooks = all.stream()
                    .filter(b -> b.getBookingStatus() != BookingStatus.CANCELLED
                            && b.getCheckInDate() != null && b.getCheckOutDate() != null
                            && !b.getCheckInDate().isAfter(futureDate)
                            && b.getCheckOutDate().isAfter(futureDate))
                    .count();

            // Last year — bookings on books for futureDateLy
            long onBooksLy = all.stream()
                    .filter(b -> b.getBookingStatus() != BookingStatus.CANCELLED
                            && b.getCheckInDate() != null && b.getCheckOutDate() != null
                            && !b.getCheckInDate().isAfter(futureDateLy)
                            && b.getCheckOutDate().isAfter(futureDateLy))
                    .count();

            // Pickup this week (bookings created in last 7 days for futureDate)
            long pickupThisWeek = all.stream()
                    .filter(b -> b.getBookingStatus() != BookingStatus.CANCELLED
                            && b.getCheckInDate() != null && b.getCheckOutDate() != null
                            && !b.getCheckInDate().isAfter(futureDate)
                            && b.getCheckOutDate().isAfter(futureDate)
                            && b.getCreatedAt() != null
                            && !b.getCreatedAt().isBefore(pickupFrom))
                    .count();

            BigDecimal occPct = BigDecimal.valueOf(onBooks * 100.0 / totalRooms)
                    .setScale(1, RoundingMode.HALF_UP);
            BigDecimal occPctLy = BigDecimal.valueOf(onBooksLy * 100.0 / totalRooms)
                    .setScale(1, RoundingMode.HALF_UP);
            long variance = onBooks - onBooksLy;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date",           futureDate.toString());
            row.put("dateLy",         futureDateLy.toString());
            row.put("roomsOnBooks",   onBooks);
            row.put("roomsOnBooksLy", onBooksLy);
            row.put("variance",       variance);
            row.put("pickupThisWeek", pickupThisWeek);
            row.put("occupancyPct",   occPct);
            row.put("occupancyPctLy", occPctLy);
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Pick-up Report — how many new bookings were made in the last N days, grouped by future arrival date.
     * Used to gauge demand momentum. Default window: 7 days.
     */
    @GetMapping("/pickup")
    public ResponseEntity<List<Map<String, Object>>> pickupReport(
            @RequestParam(defaultValue = "7") int days) {
        LocalDate today = LocalDate.now();
        java.time.LocalDateTime cutoff = today.minusDays(Math.min(days, 90)).atStartOfDay();

        List<Booking> recent = bookingRepository.findActiveWithDates(BookingStatus.CANCELLED)
                .stream()
                .filter(b -> b.getCreatedAt() != null
                        && !b.getCreatedAt().isBefore(cutoff)
                        && !b.getCheckInDate().isBefore(today))
                .toList();

        Map<LocalDate, Long> byArrival = new LinkedHashMap<>();
        for (int d = 0; d < 90; d++) {
            byArrival.put(today.plusDays(d), 0L);
        }
        for (Booking b : recent) {
            byArrival.computeIfPresent(b.getCheckInDate(), (k, v) -> v + 1);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        byArrival.forEach((date, count) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("arrivalDate", date.toString());
            row.put("newBookings", count);
            result.add(row);
        });
        return ResponseEntity.ok(result);
    }

    /**
     * Occupancy Heatmap — daily occupancy % for the last 12 months.
     * Returns each day's occupancy percentage for calendar heatmap rendering.
     */
    @GetMapping("/occupancy-heatmap")
    public ResponseEntity<List<Map<String, Object>>> occupancyHeatmap(
            @RequestParam(defaultValue = "365") int days) {
        LocalDate today = LocalDate.now();
        LocalDate from = today.minusDays(Math.min(days, 365));
        long totalRooms = Math.max(roomRepository.count(), 1);

        // Load only bookings that overlap the window (not all active bookings)
        List<Booking> window = bookingRepository.findAllOverlapping(from, today.plusDays(1));

        // Build occupancy map in O(n × avg_stay_nights) instead of O(n × days)
        java.util.Map<LocalDate, Long> occupancyMap = new java.util.HashMap<>();
        for (Booking b : window) {
            if (b.getCheckInDate() == null || b.getCheckOutDate() == null) continue;
            LocalDate cur = b.getCheckInDate().isBefore(from) ? from : b.getCheckInDate();
            LocalDate end = b.getCheckOutDate().isAfter(today.plusDays(1)) ? today.plusDays(1) : b.getCheckOutDate();
            while (cur.isBefore(end)) {
                occupancyMap.merge(cur, 1L, Long::sum);
                cur = cur.plusDays(1);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate cursor = from;
        while (!cursor.isAfter(today)) {
            long occupied = occupancyMap.getOrDefault(cursor, 0L);
            BigDecimal pct = BigDecimal.valueOf(occupied * 100.0 / totalRooms)
                    .setScale(1, RoundingMode.HALF_UP);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date",         cursor.toString());
            row.put("occupied",     occupied);
            row.put("occupancyPct", pct);
            result.add(row);
            cursor = cursor.plusDays(1);
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Daily operations manifest: arrivals and departures for a given date.
     * Returns two lists: arrivals (checkInDate == date) and departures (checkOutDate == date).
     */
    @GetMapping("/manifest")
    public ResponseEntity<Map<String, Object>> manifest(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        if (date == null) date = LocalDate.now();
        final LocalDate targetDate = date;

        List<Booking> allForDay = bookingRepository.findAllOverlapping(targetDate, targetDate.plusDays(1));

        java.util.function.Function<Booking, Map<String, Object>> toRow = b -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("bookingId",   b.getId());
            row.put("guestName",   b.getGuest() != null
                ? b.getGuest().getFirstName() + " " + b.getGuest().getLastName() : "—");
            row.put("guestEmail",  b.getGuest() != null ? b.getGuest().getEmail() : "—");
            row.put("roomNumber",  b.getRoom() != null ? b.getRoom().getRoomNumber() : null);
            row.put("roomType",    b.getRoom() != null && b.getRoom().getRoomType() != null
                ? b.getRoom().getRoomType().getName() : "—");
            row.put("checkIn",     b.getCheckInDate());
            row.put("checkOut",    b.getCheckOutDate());
            row.put("status",      b.getBookingStatus());
            row.put("paymentStatus", b.getPaymentStatus());
            row.put("totalAmount", b.getTotalAmount());
            row.put("nights",      b.getCheckInDate() != null && b.getCheckOutDate() != null
                ? (int) ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()) : 0);
            return row;
        };

        List<Map<String, Object>> arrivals = allForDay.stream()
                .filter(b -> targetDate.equals(b.getCheckInDate()))
                .map(toRow)
                .toList();

        List<Map<String, Object>> departures = allForDay.stream()
                .filter(b -> targetDate.equals(b.getCheckOutDate()))
                .map(toRow)
                .toList();

        List<Map<String, Object>> inHouse = allForDay.stream()
                .filter(b -> b.getCheckInDate() != null && b.getCheckInDate().isBefore(targetDate)
                          && b.getCheckOutDate() != null && b.getCheckOutDate().isAfter(targetDate))
                .map(toRow)
                .toList();

        return ResponseEntity.ok(Map.of(
                "date",       targetDate.toString(),
                "arrivals",   arrivals,
                "departures", departures,
                "inHouse",    inHouse,
                "totalArrivals",   arrivals.size(),
                "totalDepartures", departures.size(),
                "totalInHouse",    inHouse.size()
        ));
    }

    /**
     * Revenue optimization suggestions: analyses occupancy over the next 30 days
     * and returns actionable pricing recommendations.
     * Returns suggestions sorted by urgency (highest revenue impact first).
     */
    @GetMapping("/revenue-suggestions")
    public ResponseEntity<List<Map<String, Object>>> revenueSuggestions() {
        long totalRooms = roomRepository.count();
        if (totalRooms == 0) return ResponseEntity.ok(List.of());

        LocalDate today = LocalDate.now();
        List<Booking> upcoming = bookingRepository.findAllOverlapping(today, today.plusDays(30));

        // Group booked nights per date
        java.util.Map<LocalDate, Long> bookedPerDay = new java.util.HashMap<>();
        for (Booking b : upcoming) {
            if (b.getBookingStatus() == BookingStatus.CANCELLED) continue;
            LocalDate d = b.getCheckInDate();
            while (d != null && d.isBefore(b.getCheckOutDate())) {
                bookedPerDay.merge(d, 1L, Long::sum);
                d = d.plusDays(1);
            }
        }

        List<Map<String, Object>> suggestions = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (int i = 1; i <= 30; i++) {
            LocalDate date    = today.plusDays(i);
            long      booked  = bookedPerDay.getOrDefault(date, 0L);
            double    pct     = (double) booked / totalRooms * 100.0;
            long      freeRms = totalRooms - booked;

            String action = null, priority = null, suggestion = null;
            int    discountPct = 0;

            if (pct < 30) {
                action = "DEEP_DISCOUNT";
                priority = "URGENT";
                discountPct = 25;
                suggestion = String.format(
                    "Occupancy only %.0f%% on %s (%d free rooms). Apply a %.0f%% last-minute discount to drive demand.",
                    pct, date, freeRms, (double) discountPct);
            } else if (pct < 55) {
                action = "PROMOTIONAL_RATE";
                priority = "HIGH";
                discountPct = 15;
                suggestion = String.format(
                    "%.0f%% occupancy on %s (%d free rooms). A %.0f%% promotional rate could fill unsold inventory.",
                    pct, date, freeRms, (double) discountPct);
            } else if (pct < 75) {
                action = "MONITOR";
                priority = "MEDIUM";
                suggestion = String.format(
                    "%.0f%% occupancy on %s — moderate pace. Watch for pick-up over next 48h before adjusting rates.",
                    pct, date);
            } else if (pct >= 90) {
                action = "PRICE_UPLIFT";
                priority = "OPPORTUNITY";
                discountPct = -15; // negative = uplift
                suggestion = String.format(
                    "High demand on %s (%.0f%% occupancy, %d rooms left). Consider a 15%% rate increase to maximise RevPAR.",
                    date, pct, freeRms);
            }

            if (action == null) continue;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date",        date.format(fmt));
            row.put("action",      action);
            row.put("priority",    priority);
            row.put("occupancyPct", Math.round(pct * 10.0) / 10.0);
            row.put("freeRooms",   freeRms);
            row.put("bookedRooms", booked);
            row.put("suggestion",  suggestion);
            if (discountPct != 0) row.put("suggestedAdjustmentPct", discountPct);
            suggestions.add(row);
        }

        // Sort: URGENT first, then HIGH, OPPORTUNITY, MEDIUM
        List<String> order = List.of("URGENT","HIGH","OPPORTUNITY","MEDIUM");
        suggestions.sort(java.util.Comparator.comparingInt(r -> order.indexOf(r.get("priority"))));

        return ResponseEntity.ok(suggestions);
    }

    /**
     * Guest analytics: length-of-stay distribution, booking window (lead time),
     * room-type mix, and country-of-origin breakdown.
     * Used by the Reports and Analytics pages.
     */
    @GetMapping("/guest-analytics")
    public ResponseEntity<Map<String, Object>> guestAnalytics() {
        List<Booking> all = bookingRepository.findActiveWithDates(BookingStatus.CANCELLED);

        // ── Length-of-stay distribution (nights) ──────────────────────
        java.util.TreeMap<String, Long> losDist = new java.util.TreeMap<>();
        for (Booking b : all) {
            long nights = ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate());
            String bucket = nights <= 1 ? "1"
                    : nights <= 2 ? "2"
                    : nights <= 3 ? "3"
                    : nights <= 5 ? "4-5"
                    : nights <= 7 ? "6-7"
                    : "8+";
            losDist.merge(bucket, 1L, Long::sum);
        }

        // ── Booking window / lead-time distribution (days before arrival) ─
        java.util.TreeMap<String, Long> windowDist = new java.util.TreeMap<>();
        for (Booking b : all) {
            if (b.getCreatedAt() == null) continue;
            long days = ChronoUnit.DAYS.between(b.getCreatedAt().toLocalDate(), b.getCheckInDate());
            if (days < 0) days = 0;
            String bucket = days == 0 ? "Same day"
                    : days <= 3  ? "1-3 days"
                    : days <= 7  ? "4-7 days"
                    : days <= 14 ? "8-14 days"
                    : days <= 30 ? "15-30 days"
                    : days <= 60 ? "31-60 days"
                    : "60+ days";
            windowDist.merge(bucket, 1L, Long::sum);
        }

        // ── Room-type mix ─────────────────────────────────────────────
        java.util.TreeMap<String, Long> roomTypeDist = new java.util.TreeMap<>();
        for (Booking b : all) {
            String rt = (b.getRoom() != null && b.getRoom().getRoomType() != null)
                    ? b.getRoom().getRoomType().getName() : "Unknown";
            roomTypeDist.merge(rt, 1L, Long::sum);
        }

        // ── Country of origin (from guest) ────────────────────────────
        java.util.TreeMap<String, Long> countryDist = new java.util.TreeMap<>();
        for (Booking b : all) {
            String country = (b.getGuest() != null && b.getGuest().getCountry() != null
                    && !b.getGuest().getCountry().isBlank())
                    ? b.getGuest().getCountry() : "Unknown";
            countryDist.merge(country, 1L, Long::sum);
        }

        // ── Average LOS and average lead time ─────────────────────────
        double avgLos = all.stream()
                .mapToLong(b -> ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()))
                .average().orElse(0);
        double avgWindow = all.stream()
                .filter(b -> b.getCreatedAt() != null)
                .mapToLong(b -> Math.max(0, ChronoUnit.DAYS.between(b.getCreatedAt().toLocalDate(), b.getCheckInDate())))
                .average().orElse(0);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalBookings",    all.size());
        result.put("avgLengthOfStay",  Math.round(avgLos * 10.0) / 10.0);
        result.put("avgLeadTimeDays",  Math.round(avgWindow * 10.0) / 10.0);
        result.put("losDist",         losDist);
        result.put("bookingWindowDist", windowDist);
        result.put("roomTypeDist",     roomTypeDist);
        result.put("countryDist",      countryDist);
        return ResponseEntity.ok(result);
    }

    /** Revenue and booking count by booking source channel. */
    @GetMapping("/revenue-by-channel")
    public ResponseEntity<List<Map<String, Object>>> revenueByChannel() {
        List<Object[]> rows = bookingRepository.revenueGroupedByChannel(BookingStatus.CANCELLED);
        long totalRev = rows.stream().mapToLong(r -> ((Number) r[2]).longValue()).sum();

        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (var row : rows) {
            String src   = row[0] != null ? row[0].toString() : "DIRECT_WEBSITE";
            long   count = ((Number) row[1]).longValue();
            long   rev   = ((Number) row[2]).longValue();
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("channel",  src);
            m.put("bookings", count);
            m.put("revenue",  rev);
            m.put("share", totalRev > 0 ? Math.round((double) rev / totalRev * 1000) / 10.0 : 0.0);
            out.add(m);
        }
        return ResponseEntity.ok(out);
    }

    /** Night audit: full-day financial summary for a given date (default today). */
    @GetMapping("/night-audit")
    public ResponseEntity<Map<String, Object>> nightAudit(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate auditDate = date != null ? date : LocalDate.now();

        List<Booking> arrivals   = bookingRepository.findByCheckInDateAndBookingStatusNot(auditDate, BookingStatus.CANCELLED);
        List<Booking> departures = bookingRepository.findByCheckOutDateAndBookingStatusNot(auditDate, BookingStatus.CANCELLED);
        List<Booking> stayovers  = bookingRepository.findStayoversOnDate(auditDate, BookingStatus.CANCELLED);

        java.time.LocalDateTime auditStart = auditDate.atStartOfDay();
        java.time.LocalDateTime auditEnd   = auditDate.plusDays(1).atStartOfDay();
        BigDecimal roomRevenue = paymentRepository.sumPaidBetween(auditStart, auditEnd);

        long totalRooms = roomRepository.count();
        long occupiedRooms = stayovers.size() + departures.size();
        double occupancy = totalRooms > 0 ? (double) occupiedRooms / totalRooms * 100 : 0;
        BigDecimal adr = occupiedRooms > 0
                ? roomRevenue.divide(BigDecimal.valueOf(occupiedRooms), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal revpar = totalRooms > 0
                ? roomRevenue.divide(BigDecimal.valueOf(totalRooms), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> audit = new java.util.LinkedHashMap<>();
        audit.put("auditDate", auditDate.toString());
        audit.put("arrivals", arrivals.size());
        audit.put("departures", departures.size());
        audit.put("stayovers", stayovers.size());
        audit.put("noShows", arrivals.stream().filter(b -> b.getBookingStatus() == BookingStatus.PENDING).count());
        audit.put("roomRevenue", roomRevenue);
        audit.put("adr", adr);
        audit.put("revpar", revpar);
        audit.put("occupancyPct", Math.round(occupancy * 10) / 10.0);
        audit.put("totalRooms", totalRooms);
        audit.put("occupiedRooms", occupiedRooms);
        audit.put("newBookings",   bookingRepository.countByCreatedAtBetween(auditStart, auditEnd));
        audit.put("cancellations", bookingRepository.countByBookingStatusAndCreatedAtBetween(
                BookingStatus.CANCELLED, auditStart, auditEnd));
        return ResponseEntity.ok(audit);
    }

    /** Bookings created per day for the past N days (default 30). */
    @GetMapping("/booking-trends")
    public ResponseEntity<List<Map<String, Object>>> bookingTrends(
            @RequestParam(defaultValue = "30") int days) {
        LocalDate from = LocalDate.now().minusDays(days - 1);
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate d = from.plusDays(i);
            java.time.LocalDateTime dayStart = d.atStartOfDay();
            java.time.LocalDateTime dayEnd   = d.plusDays(1).atStartOfDay();
            long count = bookingRepository.countByCreatedAtBetween(dayStart, dayEnd);
            BigDecimal revenue = paymentRepository.sumPaidBetween(dayStart, dayEnd);
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("date", d.toString());
            m.put("bookings", count);
            m.put("revenue", revenue);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    /** Repeating guests: guests with more than 1 booking, ranked by stay count. */
    @GetMapping("/repeat-guests")
    public ResponseEntity<List<Map<String, Object>>> repeatGuests() {
        java.util.Map<String, long[]> guestMap = new java.util.LinkedHashMap<>();
        for (var b : bookingRepository.findByBookingStatusNot(BookingStatus.CANCELLED)) {
            String key = b.getGuestName() != null ? b.getGuestName() : "Unknown";
            guestMap.computeIfAbsent(key, k -> new long[]{0, 0});
            guestMap.get(key)[0]++;
            if (b.getTotalAmount() != null) guestMap.get(key)[1] += b.getTotalAmount().longValue();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        guestMap.entrySet().stream()
                .filter(e -> e.getValue()[0] > 1)
                .sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0]))
                .limit(20)
                .forEach(e -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("guestName", e.getKey());
                    m.put("stays", e.getValue()[0]);
                    m.put("totalSpent", e.getValue()[1]);
                    result.add(m);
                });
        return ResponseEntity.ok(result);
    }
}
