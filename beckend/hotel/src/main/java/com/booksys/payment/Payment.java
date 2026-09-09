package com.booksys.payment;
import com.booksys.booking.Booking;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue
    private UUID id;

    /**
     * Last four digits of the card, for reconciling a payment with a receipt.
     * The full number, the expiry date and the CVV are never stored: the CVV in
     * particular must not be retained after authorisation, and a stored PAN is a
     * liability this system has no reason to carry. Real charges go through
     * Stripe, which holds the card on its side.
     */
    @Column(length = 4)
    private String cardLast4;
    private UUID guestId;
    private String guestName;
    private String guestEmail;
    private String guestAddress;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String paymentMethod;

    @Column(nullable = false)
    private LocalDateTime paymentDate;

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    @OneToOne
    @JoinColumn(name = "booking_id")
    private Booking booking;
}
