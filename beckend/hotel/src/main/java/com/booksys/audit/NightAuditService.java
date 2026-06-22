package com.booksys.audit;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.housekeeping.HousekeepingRepository;
import com.booksys.housekeeping.HousekeepingStatus;
import com.booksys.housekeeping.HousekeepingTask;
import com.booksys.housekeeping.HousekeepingType;
import com.booksys.housekeeping.Priority;
import com.booksys.notification.NotificationService;
import com.booksys.payment.PaymentStatus;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Runs once per day at 02:00 to:
 *  1. Auto-checkout overdue bookings and free their rooms.
 *  2. Auto-generate CHECKOUT_CLEAN housekeeping tasks for freed rooms.
 *  3. Fire a summary notification to ADMIN/RECEPTION roles.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NightAuditService {

    private final BookingRepository      bookingRepository;
    private final RoomRepository         roomRepository;
    private final HousekeepingRepository housekeepingRepository;
    private final NotificationService    notificationService;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void runNightAudit() {
        LocalDate today = LocalDate.now();
        log.info("Night audit started for date {}", today);

        List<Booking> overdue = bookingRepository.findOverdueBookings(today);
        if (overdue.isEmpty()) {
            log.info("Night audit: no overdue bookings found");
            return;
        }

        int processed = 0;
        int tasksCreated = 0;

        for (Booking b : overdue) {
            try {
                BookingStatus newStatus = b.getPaymentStatus() == PaymentStatus.PAID
                        ? BookingStatus.COMPLETED
                        : BookingStatus.CHECKED_OUT;
                b.setBookingStatus(newStatus);
                bookingRepository.save(b);

                var room = b.getRoom();
                if (room != null) {
                    room.setRoomStatus(RoomStatus.FREE);
                    roomRepository.save(room);

                    // Auto-generate checkout cleaning task
                    HousekeepingTask task = HousekeepingTask.builder()
                            .roomNumber(room.getRoomNumber())
                            .roomId(room.getId() != null ? room.getId().toString() : null)
                            .status(HousekeepingStatus.PENDING)
                            .type(HousekeepingType.CHECKOUT_CLEAN)
                            .priority(Priority.HIGH)
                            .notes("Auto-generated: guest checked out. Room requires full checkout clean.")
                            .scheduledAt(LocalDateTime.now().withHour(8).withMinute(0).withSecond(0))
                            .build();
                    housekeepingRepository.save(task);
                    tasksCreated++;
                }

                processed++;
                log.info("Night audit: booking {} auto-checked-out → {}", b.getId(), newStatus);
            } catch (Exception e) {
                log.error("Night audit failed for booking {}: {}", b.getId(), e.getMessage());
            }
        }

        if (processed > 0) {
            notificationService.create(
                "SYSTEM",
                "Night Audit Complete",
                String.format("Night audit processed %d booking%s. %d housekeeping task%s auto-generated for checkout cleans.",
                    processed, processed == 1 ? "" : "s",
                    tasksCreated, tasksCreated == 1 ? "" : "s"),
                "ADMIN"
            );
        }

        log.info("Night audit complete: {} bookings processed, {} tasks created", processed, tasksCreated);
    }
}
