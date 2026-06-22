package com.booksys.employee;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class StaffDTO {
    private UUID id;
    private UUID hotelId;
    private String firstName;
    private String lastName;
    private String positions;
    private BigDecimal salary;
    private LocalDate dateOfBirth;
    private String phone;
    private String email;
    private LocalDate hireDate;
    private String hotelName;
}
