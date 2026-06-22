package com.booksys.invoice;

import com.booksys.booking.Booking;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;


@Entity
@Table(name = "invoices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(unique = true, nullable = false)
    private String invoiceNumber;

    private BigDecimal amount;

    private LocalDateTime issuedDate;

    @Enumerated(EnumType.STRING)
    private InvoiceStatus status;

    private String pdfUrl;

    @PrePersist
    public void prePersist() {
        if (issuedDate == null) {
            issuedDate = LocalDateTime.now();
        }
        if (status == null) {
            status = InvoiceStatus.GENERATED;
        }
        if (invoiceNumber == null) {
            invoiceNumber = "INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
    }


}
