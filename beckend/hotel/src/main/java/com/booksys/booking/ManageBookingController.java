package com.booksys.booking;

import com.booksys.email.EmailService;
import com.booksys.ratelimit.KeyedRateLimiter;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * "Manage my booking" for guests without an account (replaces the old
 * {@code my-bookings?email=} and {@code {id}/cancel?email=} endpoints, which
 * let anyone who knew an e-mail address list and cancel that guest's bookings).
 *
 * <ol>
 *   <li>{@code POST /request-link {email}} — e-mails a signed link to that
 *       address. The answer is the same whether or not bookings exist, so the
 *       endpoint cannot be used to find out who stays at the hotel.</li>
 *   <li>{@code GET /api/public/bookings/manage} with header
 *       {@code X-Booking-Token} — the bookings the token covers.</li>
 *   <li>{@code POST /{id}/cancel} with the same header — cancels one of them.</li>
 * </ol>
 */
@Slf4j
@RestController
@RequestMapping("/api/public/bookings/manage")
public class ManageBookingController {

    static final String TOKEN_HEADER = "X-Booking-Token";
    private static final Duration LINK_VALIDITY = Duration.ofHours(24);
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final BookingRepository bookingRepository;
    private final GuestBookingService guestBookingService;
    private final BookingManageTokens tokens;
    private final EmailService emailService;
    private final String frontendBaseUrl;

    /** At most 3 links per address and hour, so the endpoint cannot be used to flood a mailbox. */
    private final KeyedRateLimiter perEmail =
            new KeyedRateLimiter(20_000, new KeyedRateLimiter.Limit(3, Duration.ofHours(1)));

    public ManageBookingController(BookingRepository bookingRepository,
                                   GuestBookingService guestBookingService,
                                   BookingManageTokens tokens,
                                   EmailService emailService,
                                   @Value("${app.frontend.base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.bookingRepository = bookingRepository;
        this.guestBookingService = guestBookingService;
        this.tokens = tokens;
        this.emailService = emailService;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
    }

    public record LinkRequest(String email) {}

    @PostMapping("/request-link")
    public ResponseEntity<Map<String, String>> requestLink(@RequestBody LinkRequest req) {
        String email = req == null || req.email() == null ? "" : req.email().trim().toLowerCase(Locale.ROOT);
        if (email.isEmpty() || email.length() > 254 || !EMAIL.matcher(email).matches()) {
            throw new IllegalArgumentException("Please enter a valid email address");
        }
        if (perEmail.tryAcquire(email)) {
            List<Booking> bookings = bookingRepository.findByGuestEmailIgnoreCase(email);
            if (!bookings.isEmpty()) {
                String link = frontendBaseUrl + "/book/manage?token=" + tokens.forEmail(email, LINK_VALIDITY);
                emailService.sendManageBookingLink(email, link, bookings.size());
            }
        } else {
            log.info("Manage-booking link throttled for one address");
        }
        // Same answer in every case (no account / booking enumeration)
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of("message",
                "If we have bookings for this address, we have sent a link to it. The link is valid for 24 hours."));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(@RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        BookingManageTokens.Grant grant = requireGrant(token);
        List<Booking> bookings = grant.scope() == BookingManageTokens.Scope.EMAIL
                ? bookingRepository.findByGuestEmailIgnoreCase(grant.email())
                : bookingRepository.findById(grant.bookingId()).stream().toList();
        return ResponseEntity.ok(Map.of(
                "scope", grant.scope().name(),
                "expiresAt", grant.expiresAt().toString(),
                "bookings", guestBookingService.viewsOf(bookings)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<GuestBookingService.GuestBookingView> cancel(
            @PathVariable UUID id,
            @RequestHeader(value = TOKEN_HEADER, required = false) String token) {
        BookingManageTokens.Grant grant = requireGrant(token);
        Booking booking = bookingRepository.findById(id)
                .filter(grant::covers)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));
        return ResponseEntity.ok(guestBookingService.cancelAsGuest(booking));
    }

    private BookingManageTokens.Grant requireGrant(String token) {
        return tokens.verify(token).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "This link is invalid or has expired. Please request a new one."));
    }
}
