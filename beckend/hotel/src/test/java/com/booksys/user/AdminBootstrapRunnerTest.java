package com.booksys.user;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Acceptance tests for the environment-gated first-admin bootstrap.
 */
@ExtendWith(MockitoExtension.class)
class AdminBootstrapRunnerTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;

    private AdminBootstrapRunner runner(String email, String password) {
        AdminBootstrapRunner r = new AdminBootstrapRunner(userRepository, passwordEncoder);
        ReflectionTestUtils.setField(r, "bootstrapEmail", email);
        ReflectionTestUtils.setField(r, "bootstrapPassword", password);
        return r;
    }

    @Test
    void disabledWhenEnvNotSet_createsNothing() {
        runner("", "").run(null);
        verify(userRepository, never()).existsByRole(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void createsAdminWhenEnabledAndNoAdminExists() {
        when(userRepository.existsByRole(Role.ADMIN)).thenReturn(false);
        when(userRepository.findByEmail("boss@hotel.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Str0ngAdminPass")).thenReturn("hashed");

        runner("Boss@Hotel.com", "Str0ngAdminPass").run(null);

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(captor.capture());
        AppUser created = captor.getValue();
        assertThat(created.getRole()).isEqualTo(Role.ADMIN);
        assertThat(created.getEmail()).isEqualTo("boss@hotel.com"); // normalised
        assertThat(created.getPassword()).isEqualTo("hashed");      // bcrypt-encoded, not raw
    }

    @Test
    void skipsWhenAdminAlreadyExists() {
        when(userRepository.existsByRole(Role.ADMIN)).thenReturn(true);

        runner("boss@hotel.com", "Str0ngAdminPass").run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void skipsWhenEmailAlreadyTakenByNonAdmin() {
        when(userRepository.existsByRole(Role.ADMIN)).thenReturn(false);
        when(userRepository.findByEmail("boss@hotel.com")).thenReturn(Optional.of(new AppUser()));

        runner("boss@hotel.com", "Str0ngAdminPass").run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void failsFastOnWeakPasswordWhenCreating() {
        when(userRepository.existsByRole(Role.ADMIN)).thenReturn(false);
        when(userRepository.findByEmail("boss@hotel.com")).thenReturn(Optional.empty());

        AdminBootstrapRunner r = runner("boss@hotel.com", "weak");
        assertThatThrownBy(() -> r.run(null))
                .isInstanceOf(IllegalArgumentException.class);

        verify(userRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(anyString());
    }
}
