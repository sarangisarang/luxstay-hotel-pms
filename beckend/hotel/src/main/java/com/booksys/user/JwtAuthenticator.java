package com.booksys.user;

import com.booksys.token.TokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Turns a bearer token into an authenticated principal. Shared by the HTTP
 * filter ({@link JwtAuthenticationFilter}) and the WebSocket CONNECT check, so
 * both apply exactly the same rules:
 *
 * <ul>
 *   <li>signature, expiry, issuer and audience are valid</li>
 *   <li>the token was not revoked (logout, refresh, password change)</li>
 *   <li>the account still exists and is enabled</li>
 *   <li>the role comes from the database, not from the token, so a demoted
 *       or deleted account loses access immediately</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticator {

    private final JwtService jwtService;
    private final UserDetailsService userService;
    private final TokenRepository tokenRepository;

    public Optional<UsernamePasswordAuthenticationToken> authenticate(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        if (tokenRepository.existsByTokenAndRevokedTrue(token) || tokenRepository.existsByTokenAndExpiredTrue(token)) {
            return Optional.empty();
        }
        String username;
        try {
            username = jwtService.extractUsername(token);
        } catch (Exception e) {   // bad signature, expired, wrong issuer/audience, garbage
            return Optional.empty();
        }
        if (username == null || !jwtService.isTokenValid(token, username)) return Optional.empty();

        UserDetails userDetails;
        try {
            userDetails = userService.loadUserByUsername(username);
        } catch (UsernameNotFoundException e) {
            return Optional.empty();
        }
        if (!userDetails.isEnabled()) return Optional.empty();

        List<GrantedAuthority> authorities = new ArrayList<>();
        for (GrantedAuthority a : userDetails.getAuthorities()) {
            String role = a.getAuthority();
            if (role == null) continue;
            authorities.add(new SimpleGrantedAuthority(role.startsWith("ROLE_") ? role : "ROLE_" + role));
        }
        return Optional.of(new UsernamePasswordAuthenticationToken(
                new User(userDetails.getUsername(), "", authorities), null, authorities));
    }
}
