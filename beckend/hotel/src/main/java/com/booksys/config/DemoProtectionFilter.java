package com.booksys.config;

import com.booksys.user.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Blocks destructive operations when the JWT carries demoAccount=true.
 * The flag is set on the user entity and stamped into the token at login —
 * no email-pattern matching.
 */
@Component
@RequiredArgsConstructor
public class DemoProtectionFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    // Paths that demo users CAN write to (safe operational actions)
    private static final Set<String> ALLOWED_WRITE_PREFIXES = Set.of(
        "/api/auth/",
        "/api/ai/",
        "/api/concierge",
        "/api/housekeeping",
        "/api/maintenance",
        "/api/notifications",
        "/api/bookings",
        "/api/payments",
        "/api/invoices",
        "/api/servicerequests",
        "/api/feedback-reviews"
    );

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        String token = extractToken(request);
        if (token == null || !jwtService.isDemoAccount(token)) {
            chain.doFilter(request, response);
            return;
        }

        String method = request.getMethod();
        String path   = request.getRequestURI();

        if (isBlocked(method, path)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"error\":\"DEMO_MODE\",\"message\":\"This action is disabled in demo mode. Demo accounts cannot modify system data.\"}"
            );
            return;
        }

        chain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    private boolean isBlocked(String method, String path) {
        if ("GET".equalsIgnoreCase(method) || "OPTIONS".equalsIgnoreCase(method)) return false;

        // All DELETEs are blocked
        if ("DELETE".equalsIgnoreCase(method)) return true;

        // Password and user-management always blocked
        if (path.contains("/change-password")) return true;
        if (path.startsWith("/api/admin/users") || path.startsWith("/api/user/")) return true;

        // External integrations always blocked
        if (path.startsWith("/api/stripe/"))   return true;
        if (path.startsWith("/api/webhooks/")) return true;

        // Email campaign sends blocked (GET to browse is fine)
        if (path.startsWith("/api/crm/campaigns")) return true;

        // Structural data: rooms, hotels, room types, employees
        if (path.startsWith("/api/rooms/")     && !path.equals("/api/rooms/availability")) return true;
        if (path.startsWith("/api/hotels/"))   return true;
        if (path.startsWith("/api/roomtypes/")) return true;
        if (path.startsWith("/api/employees/")) return true;

        // Allow explicitly safe write prefixes
        for (String prefix : ALLOWED_WRITE_PREFIXES) {
            if (path.startsWith(prefix)) return false;
        }

        // Block everything else that isn't GET
        return true;
    }
}
