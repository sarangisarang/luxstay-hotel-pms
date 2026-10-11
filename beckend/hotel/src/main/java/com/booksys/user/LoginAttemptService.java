package com.booksys.user;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Limits failed logins per account (independent of the caller's IP), so a
 * password cannot be brute-forced from many addresses: after
 * {@value #MAX_FAILURES} wrong passwords within 15 minutes the account is
 * temporarily blocked for logins.
 */
@Service
public class LoginAttemptService {

    static final int MAX_FAILURES = 10;
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int MAX_TRACKED_ACCOUNTS = 50_000;

    /** LRU-bounded, so random e-mail addresses cannot exhaust memory. */
    private final Map<String, Bucket> failures = Collections.synchronizedMap(
            new LinkedHashMap<>(256, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
                    return size() > MAX_TRACKED_ACCOUNTS;
                }
            });

    /** @return {@code true} when the account has used up its failed attempts */
    public boolean isBlocked(String email) {
        Bucket bucket = failures.get(key(email));
        return bucket != null && bucket.getAvailableTokens() <= 0;
    }

    /** Records one wrong password for the account. */
    public void loginFailed(String email) {
        failures.computeIfAbsent(key(email), k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(MAX_FAILURES).refillGreedy(MAX_FAILURES, WINDOW).build())
                .build()).tryConsume(1);
    }

    /** A successful login clears the failures. */
    public void loginSucceeded(String email) {
        failures.remove(key(email));
    }

    private static String key(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
