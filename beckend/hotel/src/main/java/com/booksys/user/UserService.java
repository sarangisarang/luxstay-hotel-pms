package com.booksys.user;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Spring Security {@link UserDetailsService} implementation that loads users by email.
 *
 * <p>This service is wired into {@link SecurityConfig}'s {@code DaoAuthenticationProvider}
 * and into {@link JwtAuthenticationFilter} as the fallback when the JWT token
 * carries no roles claim.</p>
 */
@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads a user's security details by their email address (used as username).
     * Called by Spring Security during the authentication process.
     *
     * @param username the user's email address
     * @return the {@link UserDetails} (implemented by {@link AppUser})
     * @throws UsernameNotFoundException if no user exists with the given email
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    /**
     * Retrieves the full {@link AppUser} entity by email.
     * Useful when you need access to domain-specific fields beyond {@link UserDetails}.
     *
     * @param email the user's email address
     * @return the {@link AppUser} entity
     * @throws UsernameNotFoundException if no user exists with the given email
     */
    public AppUser findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
}
