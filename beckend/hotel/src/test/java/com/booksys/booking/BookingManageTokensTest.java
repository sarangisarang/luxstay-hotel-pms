package com.booksys.booking;

import com.booksys.guest.Guest;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class BookingManageTokensTest {

    private static final String SECRET = "unit-test-secret-unit-test-secret-1234567";
    private final Instant now = Instant.parse("2026-10-11T10:00:00Z");
    private final BookingManageTokens tokens = new BookingManageTokens(SECRET, Clock.fixed(now, ZoneOffset.UTC));

    @Test
    void emailTokenCoversBookingsOfThatAddressOnly() {
        String token = tokens.forEmail("Anna@Example.org", Duration.ofHours(24));
        BookingManageTokens.Grant grant = tokens.verify(token).orElseThrow();
        assertEquals(BookingManageTokens.Scope.EMAIL, grant.scope());
        assertEquals("anna@example.org", grant.email());
        assertTrue(grant.covers(bookingOf("ANNA@example.org")));
        assertFalse(grant.covers(bookingOf("bert@example.org")));
    }

    @Test
    void bookingTokenCoversExactlyOneBooking() {
        Booking b = bookingOf("anna@example.org");
        String token = tokens.forBooking(b.getId(), now.plus(Duration.ofDays(3)));
        BookingManageTokens.Grant grant = tokens.verify(token).orElseThrow();
        assertTrue(grant.covers(b));
        assertFalse(grant.covers(bookingOf("anna@example.org")));
    }

    @Test
    void expiredForgedOrForeignTokensAreRejected() {
        String token = tokens.forEmail("anna@example.org", Duration.ofMinutes(5));
        BookingManageTokens later = new BookingManageTokens(SECRET, Clock.fixed(now.plus(Duration.ofMinutes(6)), ZoneOffset.UTC));
        assertTrue(later.verify(token).isEmpty(), "expired");

        String forged = token.substring(0, token.indexOf('.') + 1) + "AAAA" + token.substring(token.indexOf('.') + 5);
        assertTrue(tokens.verify(forged).isEmpty(), "bad signature");

        BookingManageTokens otherKey = new BookingManageTokens("another-secret-another-secret-12345678", Clock.fixed(now, ZoneOffset.UTC));
        assertTrue(otherKey.verify(token).isEmpty(), "other deployment");

        assertTrue(tokens.verify(null).isEmpty());
        assertTrue(tokens.verify("garbage").isEmpty());
        assertTrue(tokens.verify("a.b").isEmpty());
    }

    @Test
    void payloadCannotBeSwappedBetweenScopes() {
        String emailToken = tokens.forEmail("anna@example.org", Duration.ofHours(1));
        String bookingToken = tokens.forBooking(UUID.randomUUID(), now.plus(Duration.ofHours(1)));
        String mixed = emailToken.substring(0, emailToken.indexOf('.')) + bookingToken.substring(bookingToken.indexOf('.'));
        assertTrue(tokens.verify(mixed).isEmpty());
    }

    private static Booking bookingOf(String email) {
        Guest g = new Guest();
        g.setEmail(email);
        Booking b = new Booking();
        b.setId(UUID.randomUUID());
        b.setGuest(g);
        return b;
    }
}
