package com.booksys.audit;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.notification.NotificationService;
import com.booksys.room.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Runs every morning at 07:00 to check occupancy for the next 7 days.
 * Fires a notification for each day where occupancy is below the ALERT_THRESHOLD.
 * Helps revenue management respond quickly to low-demand periods.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OccupancyAlertScheduler {

    private static final double ALERT_THRESHOLD = 0.60; // 60% occupancy triggers alert

    private static final Set<BookingStatus> ACTIVE_STATUSES = EnumSet.of(
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN
    );

    private final BookingRepository  bookingRepository;
    private final RoomRepository     roomRepository;
    private final NotificationService notificationService;

    @Scheduled(cron = "0 0 7 * * *")
    public void checkOccupancy() {
        long totalRooms = roomRepository.count();
        if (totalRooms == 0) return;

        LocalDate today = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("EEE dd MMM");

        for (int i = 1; i <= 7; i++) {
            LocalDate date = today.plusDays(i);
            List<Booking> active = bookingRepository.findAllOverlapping(date, date.plusDays(1));
            long occupied = active.stream()
                    .filter(b -> ACTIVE_STATUSES.contains(b.getBookingStatus()))
                    .count();
            double pct = (double) occupied / totalRooms;

            if (pct < ALERT_THRESHOLD) {
                int occupancyInt = (int) Math.round(pct * 100);
                int freeRooms    = (int) (totalRooms - occupied);
                String dateStr   = date.format(fmt);

                String title   = String.format("Low Occupancy Alert — %s", dateStr);
                String message = String.format(
                        "%d%% occupancy for %s (%d free room%s). Consider a promotional rate or last-minute discount.",
                        occupancyInt, dateStr, freeRooms, freeRooms == 1 ? "" : "s"
                );

                notificationService.create("LOW_OCCUPANCY", title, message, "ADMIN");
                log.info("Occupancy alert: {} — {}% ({} occupied / {} total)", dateStr, occupancyInt, occupied, totalRooms);
            }
        }
    }
}
