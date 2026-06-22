package com.booksys.email;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.mail.from-name}")
    private String fromName;

    @Async
    public void sendBookingConfirmation(BookingEmailData data) {
        if (data.guestEmail() == null || data.guestEmail().isBlank()) {
            log.warn("Skipping confirmation email — no guest email for booking {}", data.bookingRef());
            return;
        }
        try {
            Context ctx = new Context();
            ctx.setVariable("guestName",  data.guestName());
            ctx.setVariable("bookingId",  data.bookingRef());
            ctx.setVariable("hotel",      data.hotelName());
            ctx.setVariable("room",       data.roomNumber());
            ctx.setVariable("checkIn",    data.checkIn().toString());
            ctx.setVariable("checkOut",   data.checkOut().toString());
            ctx.setVariable("nights",     data.nights());
            ctx.setVariable("total",      data.total() != null ? data.total() : BigDecimal.ZERO);

            String html = templateEngine.process("email/booking-confirmation", ctx);
            sendEmail(data.guestEmail(), "✅ Booking Confirmed — " + data.hotelName(), html);
            log.info("Confirmation email sent to {}", data.guestEmail());
        } catch (Exception e) {
            log.error("Failed to send confirmation email to {}: {}", data.guestEmail(), e.getMessage());
        }
    }

    @Async
    public void sendBookingCancellation(BookingEmailData data) {
        if (data.guestEmail() == null || data.guestEmail().isBlank()) return;
        try {
            Context ctx = new Context();
            ctx.setVariable("guestName",  data.guestName());
            ctx.setVariable("bookingId",  data.bookingRef());
            ctx.setVariable("hotel",      data.hotelName());
            ctx.setVariable("checkIn",    data.checkIn() != null ? data.checkIn().toString() : "—");
            ctx.setVariable("checkOut",   data.checkOut() != null ? data.checkOut().toString() : "—");

            String html = templateEngine.process("email/booking-cancellation", ctx);
            sendEmail(data.guestEmail(), "❌ Booking Cancelled — " + data.hotelName(), html);
            log.info("Cancellation email sent to {}", data.guestEmail());
        } catch (Exception e) {
            log.error("Failed to send cancellation email to {}: {}", data.guestEmail(), e.getMessage());
        }
    }

    @Async
    public void sendCheckInReminder(BookingEmailData data) {
        if (data.guestEmail() == null || data.guestEmail().isBlank()) return;
        try {
            Context ctx = new Context();
            ctx.setVariable("guestName", data.guestName());
            ctx.setVariable("hotel",     data.hotelName());
            ctx.setVariable("room",      data.roomNumber());
            ctx.setVariable("checkIn",   data.checkIn().toString());

            String html = templateEngine.process("email/checkin-reminder", ctx);
            sendEmail(data.guestEmail(), "🏨 Check-in Tomorrow — " + data.hotelName(), html);
        } catch (Exception e) {
            log.error("Failed to send reminder email: {}", e.getMessage());
        }
    }

    @Async
    public void sendRaw(String to, String recipientName, String subject, String htmlBody) {
        try {
            sendEmail(to, subject, htmlBody);
        } catch (Exception e) {
            log.error("Failed to send raw email to {}: {}", to, e.getMessage());
        }
    }

    private void sendEmail(String to, String subject, String html) throws Exception {
        MimeMessage msg = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
        helper.setFrom(fromAddress, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        mailSender.send(msg);
    }
}
