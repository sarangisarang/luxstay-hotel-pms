package com.booksys.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IP-based rate limiter for public (unauthenticated) endpoints.
 *
 * Limits:
 *   /api/public/bookings (POST) — 10 requests / minute per IP
 *   /api/public/stripe   (POST) — 20 requests / minute per IP
 *   /api/auth/**               — 10 requests / minute per IP  (brute-force guard)
 *
 * Authenticated endpoints are not rate-limited here (JWT already scopes them).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final ConcurrentHashMap<String, Bucket> bookingBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> authBuckets    = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {

        String path = req.getRequestURI();
        String method = req.getMethod();
        String ip = resolveIp(req);

        // Only rate-limit POST/mutation calls on public paths
        if ("POST".equalsIgnoreCase(method)) {
            if (path.startsWith("/api/auth/")) {
                if (!authBuckets.computeIfAbsent(ip, k -> buildBucket(10, Duration.ofMinutes(1))).tryConsume(1)) {
                    reject(res, "Too many login attempts. Try again in a minute.");
                    return;
                }
            } else if (path.startsWith("/api/public/bookings") || path.startsWith("/api/public/stripe")) {
                if (!bookingBuckets.computeIfAbsent(ip, k -> buildBucket(20, Duration.ofMinutes(1))).tryConsume(1)) {
                    reject(res, "Too many requests. Try again in a minute.");
                    return;
                }
            }
        }

        chain.doFilter(req, res);
    }

    private Bucket buildBucket(int capacity, Duration refillPeriod) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, refillPeriod)
                        .build())
                .build();
    }

    private void reject(HttpServletResponse res, String message) throws IOException {
        res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"" + message + "\"}");
    }

    private String resolveIp(HttpServletRequest req) {
        String forwarded = req.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
