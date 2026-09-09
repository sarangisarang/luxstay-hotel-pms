package com.booksys.payment.dto;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
public class PaymentRequestDTO {
    private UUID bookingId;
    private BigDecimal amount;
    private String paymentMethod;
    private LocalDate paymentDate;
    private String status;
    /**
     * Full card number as typed in the demo form. Only its last four digits are
     * kept; the rest is discarded in the mapper and never persisted. Expiry and
     * CVV are not accepted at all.
     */
    private String cardNumber;
}

