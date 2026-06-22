package com.booksys.hotel;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.payment.PaymentRepository;
import com.booksys.payment.PaymentStatus;
import com.booksys.room.Room;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chain")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ChainController {

    private final HotelRepository hotelRepo;
    private final RoomRepository roomRepo;
    private final BookingRepository bookingRepo;
    private final PaymentRepository paymentRepo;

    /** Chain-wide summary KPIs. */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        long totalRooms  = roomRepo.count();
        long occupied    = bookingRepo.countByBookingStatus(BookingStatus.CHECKED_IN);
        double occupancy = totalRooms > 0 ? (occupied * 100.0 / totalRooms) : 0;

        LocalDate today      = LocalDate.now();
        LocalDateTime dayStart   = today.atStartOfDay();
        LocalDateTime dayEnd     = today.plusDays(1).atStartOfDay();
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime yearStart  = today.withDayOfYear(1).atStartOfDay();

        BigDecimal revenueToday = paymentRepo.sumPaidBetween(dayStart, dayEnd);
        BigDecimal revenueMtd   = paymentRepo.sumPaidBetween(monthStart, dayEnd);
        BigDecimal revenueYtd   = paymentRepo.sumPaidBetween(yearStart, dayEnd);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalHotels",      hotelRepo.count());
        out.put("totalRooms",       totalRooms);
        out.put("occupiedRooms",    occupied);
        out.put("occupancyPct",     BigDecimal.valueOf(occupancy).setScale(1, RoundingMode.HALF_UP));
        out.put("revenueToday",     revenueToday);
        out.put("revenueMtd",       revenueMtd);
        out.put("revenueYtd",       revenueYtd);
        out.put("totalBookings",    bookingRepo.count());
        out.put("freeRooms",        roomRepo.countByRoomStatus(RoomStatus.FREE));
        out.put("maintenanceRooms", roomRepo.countByRoomStatus(RoomStatus.MAINTENANCE));
        return ResponseEntity.ok(out);
    }

    /** Per-hotel comparison KPIs. */
    @GetMapping("/compare")
    public ResponseEntity<List<Map<String, Object>>> compare() {
        List<Hotel> hotels = hotelRepo.findAll();
        List<Room>  rooms  = roomRepo.findAll();
        Map<UUID, List<Room>> roomsByHotel = rooms.stream()
                .filter(r -> r.getHotel() != null)
                .collect(Collectors.groupingBy(r -> r.getHotel().getId()));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Hotel h : hotels) {
            List<Room>    hr = roomsByHotel.getOrDefault(h.getId(), List.of());
            // one indexed JOIN query per hotel (SELECT b FROM Booking b WHERE b.room.hotel.id = :hotelId)
            List<Booking> hb = bookingRepo.findByHotelId(h.getId());

            long totalRooms = hr.size();
            long occupied   = hr.stream().filter(r -> r.getRoomStatus() == RoomStatus.OCCUPIED).count();
            double occ      = totalRooms > 0 ? (occupied * 100.0 / totalRooms) : 0;

            // ADR = average daily rate from paid bookings
            BigDecimal totalRevenue = hb.stream()
                    .filter(b -> b.getPaymentStatus() == PaymentStatus.PAID && b.getTotalAmount() != null)
                    .map(Booking::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long paidNights = hb.stream()
                    .filter(b -> b.getPaymentStatus() == PaymentStatus.PAID)
                    .mapToLong(b -> b.getCheckInDate() != null && b.getCheckOutDate() != null
                            ? java.time.temporal.ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()) : 0)
                    .sum();
            BigDecimal adr = paidNights > 0
                    ? totalRevenue.divide(BigDecimal.valueOf(paidNights), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal revPar = totalRooms > 0
                    ? adr.multiply(BigDecimal.valueOf(occ / 100)).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("hotelId",     h.getId());
            m.put("hotelName",   h.getName());
            m.put("city",        h.getCity() != null ? h.getCity() : "");
            m.put("country",     h.getCountry() != null ? h.getCountry() : "");
            m.put("totalRooms",  totalRooms);
            m.put("occupiedRooms", occupied);
            m.put("occupancyPct", BigDecimal.valueOf(occ).setScale(1, RoundingMode.HALF_UP));
            m.put("adr",         adr);
            m.put("revPar",      revPar);
            m.put("totalRevenue", totalRevenue.setScale(2, RoundingMode.HALF_UP));
            m.put("totalBookings", hb.size());
            result.add(m);
        }

        result.sort(Comparator.comparing(
                m -> ((BigDecimal) m.get("revPar")), Comparator.reverseOrder()));
        return ResponseEntity.ok(result);
    }
}
