package com.booksys.ratelimit;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;

class KeyedRateLimiterTest {

    @Test
    void limitsPerKey() {
        KeyedRateLimiter limiter = new KeyedRateLimiter(100, new KeyedRateLimiter.Limit(3, Duration.ofMinutes(1)));
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("1.2.3.4"));
        assertFalse(limiter.tryAcquire("1.2.3.4"));
        assertTrue(limiter.tryAcquire("5.6.7.8"), "other keys are independent");
    }

    @Test
    void allLimitsApply() {
        KeyedRateLimiter limiter = new KeyedRateLimiter(100,
                new KeyedRateLimiter.Limit(10, Duration.ofMinutes(1)),
                new KeyedRateLimiter.Limit(2, Duration.ofDays(1)));
        assertTrue(limiter.tryAcquire("k"));
        assertTrue(limiter.tryAcquire("k"));
        assertFalse(limiter.tryAcquire("k"), "daily limit");
    }

    @Test
    void memoryIsBounded() {
        KeyedRateLimiter limiter = new KeyedRateLimiter(10, new KeyedRateLimiter.Limit(1, Duration.ofHours(1)));
        assertTrue(limiter.tryAcquire("first"));
        assertFalse(limiter.tryAcquire("first"));
        for (int i = 0; i < 50; i++) limiter.tryAcquire("k" + i);
        // "first" was evicted (LRU), so the map did not grow beyond its bound
        assertTrue(limiter.tryAcquire("first"));
    }
}
