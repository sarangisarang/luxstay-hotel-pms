package com.booksys.user;

import com.booksys.employee.StaffRepository;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import com.booksys.guest.GuestService;
import com.booksys.hotel.HotelRepository;
import com.booksys.token.TokenService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Security regression tests for public self-registration.
 *
 * <p>The public {@code POST /api/auth/register} endpoint must never let an
 * anonymous caller provision a privileged account. These tests pin that
 * guarantee: requesting {@code ADMIN}/{@code RECEPTION} is rejected and no
 * user row is created, while ordinary {@code USER} sign-up keeps working.</p>
 */
@ExtendWith(MockitoExtension.class)
class AuthenticationServiceRegistrationTest {

    @Mock GuestService guestService;
    @Mock GuestRepository guestRepository;
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @Mock AuthenticationManager authenticationManager;
    @Mock TokenService tokenService;
    @Mock HotelRepository hotelRepository;
    @Mock StaffRepository staffRepository;

    @InjectMocks AuthenticationService service;

    private RegisterRequest req(Role role) {
        return RegisterRequest.builder()
                .email("attacker@example.com")
                .password("Passw0rd!")
                .role(role)
                .firstName("Eve")
                .lastName("Hacker")
                .phone("555000000")
                .address("Tbilisi")
                .build();
    }

    @Test
    void selfRegisterAsAdminIsRejectedAndNoUserCreated() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.register(req(Role.ADMIN)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("administrator");

        verify(userRepository, never()).save(any());
    }

    @Test
    void selfRegisterAsReceptionIsRejectedAndNoUserCreated() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.register(req(Role.RECEPTION)))
                .isInstanceOf(IllegalArgumentException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void selfRegisterAsUserSucceedsWithUserRole() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(guestService.createGuest(any())).thenReturn(mock(Guest.class));
        when(jwtService.generateToken(any())).thenReturn("jwt-token");

        AuthResponse resp = service.register(req(Role.USER));

        assertThat(resp.getRole()).isEqualTo("USER");

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository, atLeastOnce()).save(captor.capture());
        assertThat(captor.getValue().getRole()).isEqualTo(Role.USER);
    }

    @Test
    void nullRoleDefaultsToUser() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(guestService.createGuest(any())).thenReturn(mock(Guest.class));
        when(jwtService.generateToken(any())).thenReturn("jwt-token");

        AuthResponse resp = service.register(req(null));

        assertThat(resp.getRole()).isEqualTo("USER");
    }
}
