package com.booksys.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.booksys.token.TokenService tokenService;

    @GetMapping("/dashboard")
    public ResponseEntity<String> getUserDashboard() {
        return ResponseEntity.ok("user dashboard");
    }

    private Authentication currentAuth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    /** Returns the current user's profile (email, role). */
    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication auth = currentAuth();
        if (auth == null || !auth.isAuthenticated()
                || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        AppUser user = userRepository.findByEmail(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        return ResponseEntity.ok(Map.of(
                "id",    user.getId(),
                "email", user.getEmail(),
                "role",  user.getRole()
        ));
    }

    /** Changes the authenticated user's password after verifying the current one. */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest req,
                                            jakarta.servlet.http.HttpServletRequest request) {
        Authentication auth = currentAuth();
        if (auth == null || !auth.isAuthenticated()
                || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        if (req.currentPassword() == null || req.newPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Both passwords are required"));
        }
        PasswordPolicy.validate(req.newPassword());   // same rule as registration (400 on failure)
        AppUser user = userRepository.findByEmail(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            return ResponseEntity.status(403).body(Map.of("error", "Current password is incorrect"));
        }
        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);

        // A changed password must end sessions elsewhere (e.g. a stolen token);
        // the session that made the change stays logged in.
        String header = request.getHeader("Authorization");
        String currentToken = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
        tokenService.revokeAllUserTokensExcept(user, currentToken);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    record ChangePasswordRequest(String currentPassword, String newPassword) {}
}
