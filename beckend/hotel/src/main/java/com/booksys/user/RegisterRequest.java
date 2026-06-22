package com.booksys.user;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class RegisterRequest {
    private String email;
    private String password;
    private Role role;

    // Extra fields for Guest
    private String firstName;
    private String lastName;
    private String phone;
    private LocalDate dateOfBirth;
    private String address;
    private UUID hotelId;
}

