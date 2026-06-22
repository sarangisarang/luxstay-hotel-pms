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

        // 0. Reject duplicate emails immediately
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }

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

        // 7. Generate token
        String jwtToken = jwtService.generateToken(user);

        return AuthResponse.builder()
                .token(jwtToken)
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }



    // Method for refreshing JWT token
    public TokenRefreshResponse refreshToken(String oldToken) {
        if (oldToken == null || oldToken.isEmpty()) {
            throw new IllegalArgumentException("Token is missing");
        }

        // Extract username from the old token
        String username = jwtService.extractUsername(oldToken);
        if (username == null) {
            throw new IllegalArgumentException("Invalid token");
        }

        // Check if token is expired
        if (jwtService.isTokenExpired(oldToken)) {
            throw new IllegalArgumentException("Token expired");
        }

        // Find the user in the database
        var user = userRepository.findByEmail(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Generate a new token for the same user
        String newToken = jwtService.generateToken(user);

        // Return new token response
        return new TokenRefreshResponse(newToken);
    }



    public AuthResponse authenticate(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        AppUser user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        String jwt = jwtService.generateToken(user);
        tokenService.revokeAllUserTokens(user);
        tokenService.saveUserToken(user, jwt);

        return new AuthResponse(jwt, user.getEmail(), user.getRole().name());
    }
}