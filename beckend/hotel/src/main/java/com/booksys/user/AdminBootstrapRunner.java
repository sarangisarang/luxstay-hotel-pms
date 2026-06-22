package com.booksys.user;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * One-time, environment-gated bootstrap of the first ADMIN account.
 *
 * <p>Since public self-registration can no longer create privileged accounts,
 * a fresh deployment needs a safe way to seed the very first administrator.
 * This runner does exactly that, under strict rules:</p>
 *
 * <ul>
 *   <li>Disabled unless both {@code ADMIN_BOOTSTRAP_EMAIL} and
 *       {@code ADMIN_BOOTSTRAP_PASSWORD} are provided.</li>
 *   <li>Creates nothing if an ADMIN already exists (no overwrite, no reset).</li>
 *   <li>Password comes only from the environment, must pass
 *       {@link AdminPasswordPolicy}, and is stored BCrypt-hashed.</li>
 *   <li>The password is never logged.</li>
 * </ul>
 *
 * <p>After the first production login, remove {@code ADMIN_BOOTSTRAP_PASSWORD}
 * from the environment.</p>
 */
@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    @Value("${admin.bootstrap.email:}")
    private String bootstrapEmail;

    @Value("${admin.bootstrap.password:}")
    private String bootstrapPassword;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        // 1. Disabled unless both values are set.
        if (bootstrapEmail == null || bootstrapEmail.isBlank()
                || bootstrapPassword == null || bootstrapPassword.isBlank()) {
            log.info("Admin bootstrap disabled (ADMIN_BOOTSTRAP_EMAIL/PASSWORD not set).");
            return;
        }

        // 2. Never overwrite or reset an existing admin.
        if (userRepository.existsByRole(Role.ADMIN)) {
            log.info("Admin bootstrap skipped: an ADMIN account already exists.");
            return;
        }

        String email = bootstrapEmail.trim().toLowerCase();

        // 3. Do not collide with an existing (non-admin) account on this email.
        if (userRepository.findByEmail(email).isPresent()) {
            log.warn("Admin bootstrap skipped: email {} is already registered.", email);
            return;
        }

        // 4. Fail fast on a weak password rather than seeding a weak admin.
        AdminPasswordPolicy.validate(bootstrapPassword);

        AppUser admin = AppUser.builder()
                .email(email)
                .password(passwordEncoder.encode(bootstrapPassword))
                .role(Role.ADMIN)
                .build();
        userRepository.save(admin);

        log.info("Bootstrap ADMIN account created for {}. Rotate ADMIN_BOOTSTRAP_PASSWORD after first login.", email);
    }
}
