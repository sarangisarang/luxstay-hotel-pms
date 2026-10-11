package com.booksys.booking;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Signed, expiring tokens for the "manage my booking" link, so guests without
 * an account can see and cancel their bookings without the old
 * "anyone who knows the e-mail address" endpoints.
 *
 * <ul>
 *   <li><b>E-mail scope</b> — sent only to that mailbox (proves ownership of
 *       the address); covers all bookings of the address; short-lived.</li>
 *   <li><b>Booking scope</b> — given to whoever made the booking (confirmation
 *       page and e-mail); covers only that one booking.</li>
 * </ul>
 *
 * <p>Format: {@code base64url(payload) "." base64url(HMAC-SHA256(payload))}.
 * The HMAC key is derived from the JWT secret, so no extra secret has to be
 * configured, and these tokens can never be used as login tokens.</p>
 */
@Component
public class BookingManageTokens {

    private static final String VERSION = "1";
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64D = Base64.getUrlDecoder();

    public enum Scope { EMAIL, BOOKING }

    /** What a valid token grants access to. */
    public record Grant(Scope scope, String email, UUID bookingId, Instant expiresAt) {
        public boolean covers(Booking b) {
            if (b == null) return false;
            if (scope == Scope.BOOKING) return b.getId().equals(bookingId);
            return b.getGuest() != null && b.getGuest().getEmail() != null
                    && b.getGuest().getEmail().trim().equalsIgnoreCase(email);
        }
    }

    private final byte[] key;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public BookingManageTokens(@Value("${jwt.secret:}") String jwtSecret) {
        this(jwtSecret, Clock.systemUTC());
    }

    BookingManageTokens(String jwtSecret, Clock clock) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("jwt.secret must be set");
        }
        this.key = hmac(jwtSecret.getBytes(StandardCharsets.UTF_8),
                "luxstay/manage-booking-link/v1".getBytes(StandardCharsets.UTF_8));
        this.clock = clock;
    }

    /** Token for all bookings of an e-mail address (to be sent to that address only). */
    public String forEmail(String email, java.time.Duration ttl) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        long exp = clock.instant().plus(ttl).getEpochSecond();
        return sign(String.join("|", VERSION, "E", Long.toString(exp), normalized));
    }

    /** Token for exactly one booking. */
    public String forBooking(UUID bookingId, Instant expiresAt) {
        return sign(String.join("|", VERSION, "B", Long.toString(expiresAt.getEpochSecond()), bookingId.toString()));
    }

    /** @return the grant, or empty when the token is malformed, forged or expired */
    public Optional<Grant> verify(String token) {
        if (token == null || token.length() > 1024) return Optional.empty();
        int dot = token.indexOf('.');
        if (dot <= 0 || dot == token.length() - 1) return Optional.empty();
        try {
            byte[] payload = B64D.decode(token.substring(0, dot));
            byte[] signature = B64D.decode(token.substring(dot + 1));
            if (!MessageDigest.isEqual(signature, hmac(key, payload))) return Optional.empty();

            String[] parts = new String(payload, StandardCharsets.UTF_8).split("\\|", 4);
            if (parts.length != 4 || !VERSION.equals(parts[0])) return Optional.empty();
            Instant expiresAt = Instant.ofEpochSecond(Long.parseLong(parts[2]));
            if (!clock.instant().isBefore(expiresAt)) return Optional.empty();
            return switch (parts[1]) {
                case "E" -> Optional.of(new Grant(Scope.EMAIL, parts[3], null, expiresAt));
                case "B" -> Optional.of(new Grant(Scope.BOOKING, null, UUID.fromString(parts[3]), expiresAt));
                default -> Optional.empty();
            };
        } catch (IllegalArgumentException e) {   // bad base64, number or UUID
            return Optional.empty();
        }
    }

    private String sign(String payload) {
        byte[] bytes = payload.getBytes(StandardCharsets.UTF_8);
        return B64.encodeToString(bytes) + "." + B64.encodeToString(hmac(key, bytes));
    }

    private static byte[] hmac(byte[] key, byte[] data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 not available", e);
        }
    }
}
