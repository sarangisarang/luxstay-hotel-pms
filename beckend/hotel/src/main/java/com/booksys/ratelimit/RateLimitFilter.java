package com.booksys.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.function.Predicate;

/**
 * IP-based rate limits for public (unauthenticated) endpoints.
 *
 * <p>The client address is {@link HttpServletRequest#getRemoteAddr()}. Behind a
 * reverse proxy, Tomcat replaces it with the real client address from
 * {@code X-Forwarded-For} — but only when the request comes from a trusted
 * proxy ({@code server.forward-headers-strategy=native}, see
 * application.properties). The previous version read the first
 * {@code X-Forwarded-For} value itself, so every request could claim a new IP
 * and the limits never applied.</p>
 *
 * <table>
 *   <tr><td>POST /api/auth/**</td><td>10 / minute</td><td>brute force (plus a per-account lock)</td></tr>
 *   <tr><td>POST /api/public/ai/**</td><td>10 / minute, 100 / day</td><td>AI cost</td></tr>
 *   <tr><td>POST /api/public/bookings/manage/request-link</td><td>5 / 10 minutes</td><td>e-mail flooding</td></tr>
 *   <tr><td>/api/public/online-checkin/**</td><td>10 / minute</td><td>spam, guessing</td></tr>
 *   <tr><td>GET /api/vouchers/validate</td><td>20 / minute</td><td>code guessing</td></tr>
 *   <tr><td>GET /api/public/bookings/manage</td><td>30 / minute</td><td>token guessing</td></tr>
 *   <tr><td>POST /api/public/bookings/**, /api/public/stripe/**</td><td>20 / minute</td><td>booking spam</td></tr>
 * </table>
 *
 * <p>The Stripe webhook is not limited: it is signature-checked and Stripe
 * may deliver bursts from shared addresses.</p>
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_TRACKED_IPS = 50_000;

    private record Rule(String name, Predicate<HttpServletRequest> matches, KeyedRateLimiter limiter, String message) {}

    private final List<Rule> rules = List.of(
            rule("auth", r -> post(r) && path(r).startsWith("/api/auth/"),
                    "Too many attempts. Try again in a minute.",
                    new KeyedRateLimiter.Limit(10, Duration.ofMinutes(1))),
            rule("public-ai", r -> post(r) && path(r).startsWith("/api/public/ai/"),
                    "Too many chat messages. Please wait a moment.",
                    new KeyedRateLimiter.Limit(10, Duration.ofMinutes(1)),
                    new KeyedRateLimiter.Limit(100, Duration.ofDays(1))),
            rule("manage-link", r -> post(r) && path(r).equals("/api/public/bookings/manage/request-link"),
                    "Too many requests. Try again in a few minutes.",
                    new KeyedRateLimiter.Limit(5, Duration.ofMinutes(10))),
            rule("online-checkin", r -> path(r).startsWith("/api/public/online-checkin"),
                    "Too many requests. Try again in a minute.",
                    new KeyedRateLimiter.Limit(10, Duration.ofMinutes(1))),
            rule("voucher", r -> path(r).equals("/api/vouchers/validate"),
                    "Too many voucher checks. Try again in a minute.",
                    new KeyedRateLimiter.Limit(20, Duration.ofMinutes(1))),
            rule("manage", r -> path(r).startsWith("/api/public/bookings/manage"),
                    "Too many requests. Try again in a minute.",
                    new KeyedRateLimiter.Limit(30, Duration.ofMinutes(1))),
            rule("booking", r -> post(r) && (path(r).startsWith("/api/public/bookings")
                            || (path(r).startsWith("/api/public/stripe") && !path(r).equals("/api/public/stripe/webhook"))),
                    "Too many requests. Try again in a minute.",
                    new KeyedRateLimiter.Limit(20, Duration.ofMinutes(1)))
    );

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest req,
                                    @NonNull HttpServletResponse res,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        if (!"OPTIONS".equalsIgnoreCase(req.getMethod())) {
            String ip = req.getRemoteAddr();
            for (Rule rule : rules) {
                if (rule.matches().test(req)) {
                    if (!rule.limiter().tryAcquire(ip)) {
                        reject(res, rule.message());
                        return;
                    }
                    break;   // first matching rule only
                }
            }
        }
        chain.doFilter(req, res);
    }

    private static Rule rule(String name, Predicate<HttpServletRequest> matches, String message,
                             KeyedRateLimiter.Limit... limits) {
        return new Rule(name, matches, new KeyedRateLimiter(MAX_TRACKED_IPS, limits), message);
    }

    private static boolean post(HttpServletRequest r) {
        return "POST".equalsIgnoreCase(r.getMethod());
    }

    private static String path(HttpServletRequest r) {
        return r.getRequestURI();
    }

    private static void reject(HttpServletResponse res, String message) throws IOException {
        res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        res.setHeader("Retry-After", "60");
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
