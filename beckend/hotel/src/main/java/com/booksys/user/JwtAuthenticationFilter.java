package com.booksys.user;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Servlet filter that extracts and validates a JWT from the {@code Authorization: Bearer …}
 * header on every request (executed at most once per request via {@link OncePerRequestFilter}).
 *
 * <p>The checks themselves live in {@link JwtAuthenticator} (shared with the
 * WebSocket CONNECT check): valid signature/issuer/audience, not revoked,
 * account enabled, role read from the database on every request.</p>
 *
 * <p>Public paths (login, register, token refresh, uploads) bypass this filter via
 * {@link #shouldNotFilter(HttpServletRequest)}.</p>
 */
@RequiredArgsConstructor
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtAuthenticator jwtAuthenticator;

    /**
     * Skips JWT validation for public endpoints that do not require authentication.
     *
     * @param request the incoming HTTP request
     * @return {@code true} if the filter should be skipped for this request
     */
    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String p = request.getServletPath();
        return p.startsWith("/api/auth/login")
                || p.startsWith("/api/auth/register")
                || p.startsWith("/api/auth/refresh")
                || p.startsWith("/uploads/");
    }

    /**
     * A missing, invalid or revoked token leaves the request anonymous: public
     * endpoints keep working (e.g. the booking site with a stale token in the
     * browser) and protected ones answer 401 through the entry point.
     */
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain) throws IOException, ServletException {

        final String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            jwtAuthenticator.authenticate(authHeader.substring(7)).ifPresent(auth -> {
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            });
        }
        chain.doFilter(request, response);
    }
}
