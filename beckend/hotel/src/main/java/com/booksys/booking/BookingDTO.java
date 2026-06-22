package com.booksys.booking;
import com.booksys.payment.PaymentStatus;
import com.booksys.service.ServiceDTO;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * BookingDTO is a Data Transfer Object for sending booking data to the frontend.
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingDTO {
    private UUID id;
    private UUID guestId;
    private String guestName;
    private UUID roomId;
    private Integer roomNumber;
    private BigDecimal totalAmount;
    private PaymentStatus paymentStatus;
    private List<UUID> serviceIds;
    private BigDecimal totalServiceAmount;
    private BookingStatus bookingStatus;
    List<ServiceDTO> services;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate checkInDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate checkOutDate;

    private BookingSource bookingSource;
    private String specialRequests;
}