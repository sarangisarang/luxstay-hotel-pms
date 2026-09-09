package com.booksys.payment.dto;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class PaymentResponseDTO {
    private UUID id;
    private UUID bookingId;
    private BigDecimal amount;
    private String paymentMethod;
    private LocalDate paymentDate;
    private String status;
    private String cardLast4;
    private UUID guestId;
    private String guestName;
    private String guestEmail;
    private String guestAddress;
}
