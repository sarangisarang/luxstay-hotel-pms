package com.booksys.email;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.guest.Guest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CheckInReminderScheduler {

    private final BookingRepository bookingRepository;
    private final EmailService emailService;

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendTomorrowReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);

        List<Booking> arriving = bookingRepository.findByCheckInDateAndBookingStatusIn(
                tomorrow, List.of(BookingStatus.CONFIRMED, BookingStatus.PENDING));

        log.info("Check-in reminder: {} guest(s) arriving on {}", arriving.size(), tomorrow);

        for (Booking b : arriving) {
            try {
                Guest guest = b.getGuest();
                if (guest == null || guest.getEmail() == null) continue;
                String hotelName = b.getRoom() != null && b.getRoom().getHotel() != null
                        ? b.getRoom().getHotel().getName() : "LuxStay";
                emailService.sendCheckInReminder(new BookingEmailData(
                        b.getId().toString().substring(0, 8).toUpperCase(),
                        guest.getEmail(),
                        guest.getFirstName() + " " + guest.getLastName(),
                        hotelName,
                        b.getRoom() != null ? String.valueOf(b.getRoom().getRoomNumber()) : "—",
                        b.getCheckInDate(),
                        b.getCheckOutDate(),
                        0L,
                        null
                ));
            } catch (Exception e) {
                log.error("Failed to queue reminder for booking {}: {}", b.getId(), e.getMessage());
            }
        }
    }
}
