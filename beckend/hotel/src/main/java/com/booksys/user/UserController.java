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
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest req) {
        Authentication auth = currentAuth();
        if (auth == null || !auth.isAuthenticated()
                || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        if (req.currentPassword() == null || req.newPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Both passwords are required"));
        }
        if (req.newPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("error", "New password must be at least 8 characters"));
        }
        AppUser user = userRepository.findByEmail(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            return ResponseEntity.status(403).body(Map.of("error", "Current password is incorrect"));
        }
        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    record ChangePasswordRequest(String currentPassword, String newPassword) {}
}
