package com.booksys.user;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.booksys.token.TokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Servlet filter that extracts and validates a JWT from the {@code Authorization: Bearer …}
 * header on every request (executed at most once per request via {@link OncePerRequestFilter}).
 *
 * <p>Role resolution strategy (in priority order):</p>
 * <ol>
 *   <li>Roles embedded in the token's {@code roles} array claim</li>
 *   <li>Role embedded in the token's scalar {@code role} claim</li>
 *   <li>Fallback: load {@link org.springframework.security.core.userdetails.UserDetails}
 *       from the database via {@link UserDetailsService}</li>
 * </ol>
 *
 * <p>Role names are normalized to the {@code ROLE_} prefix required by Spring Security
 * (e.g. {@code "ADMIN"} → {@code "ROLE_ADMIN"}).</p>
 *
 * <p>Public paths (login, register, token refresh, uploads) bypass this filter via
 * {@link #shouldNotFilter(HttpServletRequest)}.</p>
 */
@RequiredArgsConstructor
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userService;
    private final TokenRepository tokenRepository;

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


    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain) throws IOException, ServletException {

        final String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);

        if (tokenRepository.existsByTokenAndRevokedTrue(token)
                || tokenRepository.existsByTokenAndExpiredTrue(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Token has been revoked");
            return;
        }

        String username;
        try {
            username = jwtService.extractUsername(token); // usually email/subject
        } catch (Exception e) {
            chain.doFilter(request, response);
            return;
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            // Validate token early
            if (!jwtService.isTokenValid(token, username)) {
                chain.doFilter(request, response);
                return;
            }


            List<String> rolesFromToken = safeRolesFromToken(token);


            Collection<? extends GrantedAuthority> authorities = toAuthorities(rolesFromToken);


            UserDetails userDetails = null;
            if (authorities.isEmpty()) {
                userDetails = userService.loadUserByUsername(username);
                authorities = userDetails.getAuthorities();
            }

            UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                            new org.springframework.security.core.userdetails.User(
                                    username,
                                    "",
                                    authorities
                            ),
                            null,
                            authorities
                    );

            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }

        chain.doFilter(request, response);
    }


    /**
     * Safely extracts role strings from the token, trying the {@code roles} array claim
     * first and falling back to the scalar {@code role} claim.
     * Returns an empty list if neither claim is present or if parsing fails.
     *
     * @param token signed JWT string
     * @return list of role strings (may be prefixed with {@code ROLE_} or not); never null
     */
    private List<String> safeRolesFromToken(String token) {
        try {
            List<String> roles = jwtService.extractRoles(token);
            if (roles != null && !roles.isEmpty()) return roles;
        } catch (Exception ignored) {}

        try {
            String single = jwtService.extractRole(token);
            if (single != null && !single.isBlank()) {
                List<String> one = new ArrayList<>();
                one.add(single);
                return one;
            }
        } catch (Exception ignored) {}

        return List.of();
    }

    /**
     * Converts a list of role strings to Spring Security {@link GrantedAuthority} objects,
     * normalizing each to the {@code ROLE_} prefix if missing.
     *
     * @param roles list of role strings (e.g. {@code ["ADMIN", "ROLE_RECEPTION"]})
     * @return collection of {@link SimpleGrantedAuthority} objects ready for the security context
     */
    private Collection<? extends GrantedAuthority> toAuthorities(List<String> roles) {
        List<GrantedAuthority> list = new ArrayList<>();
        for (String r : roles) {
            if (r == null) continue;
            String normalized = r.startsWith("ROLE_") ? r : "ROLE_" + r;
            list.add(new SimpleGrantedAuthority(normalized));
        }
        return list;
    }
}