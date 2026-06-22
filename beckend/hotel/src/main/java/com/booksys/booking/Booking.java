package com.booksys.booking;

import com.booksys.guest.Guest;
import com.booksys.payment.Payment;
import com.booksys.payment.PaymentStatus;
import com.booksys.room.Room;
import com.booksys.service.ServiceEntity;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity representing a booking in the hotel system.
 */

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @ToString.Include
    private Integer roomNumber;

    @ToString.Include
    private String guestName;

    @ToString.Include
    private BigDecimal totalAmount;

    @ToString.Include
    private BigDecimal totalServiceAmount;

    @Column(name = "check_in_date")
    @ToString.Include
    private LocalDate checkInDate;

    @Column(name = "check_out_date")
    @ToString.Include
    private LocalDate checkOutDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @JsonBackReference("room-bookings")
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guest_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @JsonBackReference("guest-bookings")
    private Guest guest;

    @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Payment payment;

    @ManyToMany
    @JoinTable(
            name = "booking_services",
            joinColumns = @JoinColumn(name = "booking_id"),
            inverseJoinColumns = @JoinColumn(name = "service_id")
    )

    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @JsonManagedReference("booking-services")
    private List<ServiceEntity> services = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @ToString.Include
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @ToString.Include
    private BookingStatus bookingStatus;

    /** Stripe PaymentIntent ID stored at booking creation for webhook reconciliation. */
    @Column(name = "stripe_payment_intent_id")
    private String stripePaymentIntentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_source")
    private BookingSource bookingSource;

    @Column(name = "special_requests", columnDefinition = "TEXT")
    private String specialRequests;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
