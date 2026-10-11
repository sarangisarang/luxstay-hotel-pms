package com.booksys.user;

import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Who is calling: the logged-in account of the current request and, for
 * guest accounts, their guest profile. Used for ownership checks, so a guest
 * account can only ever reach its own bookings and data.
 */
@Component
@RequiredArgsConstructor
public class CurrentUser {

    private final UserRepository userRepository;
    private final GuestRepository guestRepository;

    /** Authentication of the current HTTP request, empty for anonymous callers. */
    public static Optional<Authentication> authentication() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        return Optional.of(auth);
    }

    /** @param role role name without prefix, e.g. {@code "ADMIN"} */
    public static boolean hasRole(Authentication auth, String role) {
        if (auth == null) return false;
        String wanted = "ROLE_" + role;
        return auth.getAuthorities().stream().anyMatch(a -> wanted.equals(a.getAuthority()));
    }

    /** Hotel staff (ADMIN or RECEPTION) may see all bookings and guests. */
    public static boolean isStaff(Authentication auth) {
        return hasRole(auth, "ADMIN") || hasRole(auth, "RECEPTION");
    }

    public boolean isStaff() {
        return authentication().map(CurrentUser::isStaff).orElse(false);
    }

    /** The account of the current request. */
    public Optional<AppUser> user() {
        return authentication().flatMap(a -> userRepository.findByEmail(a.getName()));
    }

    /** @throws AuthenticationCredentialsNotFoundException (HTTP 401) when nobody is logged in */
    public AppUser require() {
        return user().orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Authentication required"));
    }

    /**
     * Guest profile linked to the given account name (e-mail), looked up with a
     * query so it also works outside an HTTP request (WebSocket messages).
     */
    public Optional<Guest> guestOf(String accountEmail) {
        if (accountEmail == null || accountEmail.isBlank()) return Optional.empty();
        return guestRepository.findFirstByAppUser_Email(accountEmail);
    }

    /**
     * Guest profile of the logged-in guest account.
     *
     * @throws AccessDeniedException (HTTP 403) for accounts without a guest profile (staff)
     */
    public Guest requireGuest() {
        AppUser user = require();
        return guestOf(user.getEmail())
                .orElseThrow(() -> new AccessDeniedException("This account has no guest profile"));
    }
}
