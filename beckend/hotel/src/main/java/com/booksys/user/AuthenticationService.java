package com.booksys.user;
import com.booksys.employee.Staff;
import com.booksys.employee.StaffRepository;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestDTO;
import com.booksys.guest.GuestRepository;
import com.booksys.guest.GuestService;
import com.booksys.hotel.Hotel;
import com.booksys.hotel.HotelRepository;
import com.booksys.hotel.TokenRefreshResponse;
import com.booksys.token.TokenService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.UUID;


@Service
@RequiredArgsConstructor
public class AuthenticationService {

    @Autowired
    private final GuestService guestService;
    private final GuestRepository guestRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final TokenService tokenService;
    private final HotelRepository hotelRepository;
    private final StaffRepository staffRepository;
    private final LoginAttemptService loginAttemptService;
    private final UserService userService;

    /** When true, a new login ends all other sessions of the account. */
    @org.springframework.beans.factory.annotation.Value("${app.auth.single-session:false}")
    private boolean singleSession;

    private static final java.util.regex.Pattern EMAIL =
            java.util.regex.Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    /**
     * Registers a new user in the system with a selected role
     * and simultaneously creates a corresponding Guest profile.
     *
     * Steps:
     * 2. Converts and validates the provided role.
     * 3. Creates a new AppUser (system user).
     * 4. Creates and saves a new Guest entity based on user info.
     * 5. Links the guest to the user.
     * 6. Saves the user to the database.
     * 7. Generates a JWT token for authentication.
     *
     * @param request RegisterRequest containing user details, role, and guest info
     * @return AuthResponse containing the JWT token
     * @throws IllegalArgumentException if passwords do not match or role is invalid
     */
    public AuthResponse register(RegisterRequest request) {

        // 0. Validate and normalise. Registration used to accept "not-an-email"
        //    with password "1", and "Anna@x.de" / "anna@x.de" as two accounts.
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase(java.util.Locale.ROOT);
        if (email.isEmpty() || email.length() > 254 || !EMAIL.matcher(email).matches()) {
            throw new IllegalArgumentException("A valid email address is required");
        }
        if (request.getFirstName() == null || request.getFirstName().isBlank()
                || request.getLastName() == null || request.getLastName().isBlank()) {
            throw new IllegalArgumentException("First and last name are required");
        }
        PasswordPolicy.validate(request.getPassword());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            // Same message for every taken address; it does not echo the input back
            throw new IllegalArgumentException("This email address is already registered");
        }
        request.setEmail(email);

        // 1. Resolve role — SECURITY: public self-registration may ONLY create a
        //    regular USER (guest) account. Privileged roles (ADMIN, RECEPTION) must be
        //    provisioned by an existing administrator, never granted through this public
        //    endpoint. Trusting request.getRole() verbatim was a privilege-escalation
        //    hole: any anonymous caller could self-assign ADMIN.
        Role selectedRole = request.getRole();
        if (selectedRole == null) {
            selectedRole = Role.USER;
        } else if (selectedRole != Role.USER) {
            throw new IllegalArgumentException(
                    "Self-registration is only permitted for guest accounts. "
                    + "Staff and administrator accounts must be created by an administrator.");
        }

        // 2. Build AppUser (system user)
        AppUser user = AppUser.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(selectedRole)
                .build();

        // 3. Save the AppUser first (important!)
        userRepository.save(user);

        // 4. If the role is RECEPTIONIST, create staff entry
        if (selectedRole == Role.RECEPTION) {
            Staff staff = new Staff();
            staff.setEmail(request.getEmail());
            staff.setFirstName(request.getFirstName());
            staff.setLastName(request.getLastName());

            // Load Hotel by ID and set it
            UUID hotelId = request.getHotelId();
            if (hotelId == null) {
                throw new IllegalArgumentException("Hotel ID is required for reception registration.");
            }

            Hotel hotel = hotelRepository.findById(hotelId)
                    .orElseThrow(() -> new EntityNotFoundException("Hotel not found with ID: " + hotelId));

            staff.setHotel(hotel);
            staffRepository.save(staff);

            user.setStaff(staff);
            userRepository.save(user); // update user with staff
        }

        // 5. Create Guest profile only for non-staff roles (RECEPTION employees are not guests)
        if (selectedRole != Role.RECEPTION) {
            GuestDTO guestDTO = GuestDTO.builder()
                    .email(request.getEmail())
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .phone(request.getPhone())
                    .birthDate(request.getDateOfBirth())
                    .address(request.getAddress())
                    .build();

            Guest guest = guestService.createGuest(guestDTO);
            guest.setAppUser(user);
            guestRepository.save(guest);

            user.setGuest(guest);
        }

        // 7. Generate and persist the token (so logout can revoke it)
        String jwtToken = jwtService.generateToken(user);
        tokenService.saveUserToken(user, jwtToken);

        return AuthResponse.builder()
                .token(jwtToken)
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }



    /**
     * Exchanges a still-valid token for a new one. A revoked token (logout,
     * password change) cannot be refreshed, and the old token is revoked, so a
     * stolen token cannot be kept alive forever by refreshing it.
     */
    public TokenRefreshResponse refreshToken(String oldToken) {
        if (oldToken == null || oldToken.isEmpty()) {
            throw new IllegalArgumentException("Token is missing");
        }
        if (tokenService.isRevoked(oldToken)) {
            throw new IllegalArgumentException("Token has been revoked");
        }

        String username;
        try {
            username = jwtService.extractUsername(oldToken);   // also verifies signature, issuer, audience
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid token");
        }
        if (username == null || jwtService.isTokenExpired(oldToken)) {
            throw new IllegalArgumentException("Token expired");
        }

        AppUser user = userService.findByEmail(username);
        String newToken = jwtService.generateToken(user);
        tokenService.saveUserToken(user, newToken);
        tokenService.revokeToken(oldToken);
        return new TokenRefreshResponse(newToken);
    }



    public AuthResponse authenticate(LoginRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        if (loginAttemptService.isBlocked(email)) {
            throw new TooManyLoginAttemptsException();
        }
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword()));
        } catch (org.springframework.security.core.AuthenticationException e) {
            loginAttemptService.loginFailed(email);
            throw e;   // mapped to HTTP 401 by the exception handler
        }
        loginAttemptService.loginSucceeded(email);

        AppUser user = userService.findByEmail(email);
        String jwt = jwtService.generateToken(user);
        if (singleSession) {
            tokenService.revokeAllUserTokens(user);
        }
        tokenService.saveUserToken(user, jwt);

        return new AuthResponse(jwt, user.getEmail(), user.getRole().name());
    }
}