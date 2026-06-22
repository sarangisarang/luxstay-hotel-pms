package com.booksys.employee;
import com.booksys.hotel.Hotel;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Setter
@Getter
@Entity
@Table(name = "staff")
public class Staff {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "hotel_name")
    private String hotelName;

    @Column(name = "last_name")
    private String lastName;

    private String positions;
    private BigDecimal salary;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    private String phone;
    private String email;

    @ManyToOne
    @JoinColumn(name = "hotel_id", nullable = false)
    private Hotel hotel;


    @Column(name = "hire_date")
    private LocalDate hireDate;


}
