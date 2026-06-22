package com.booksys.invoice;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceDTO {
    private UUID id;
    private UUID bookingId;
    private String invoiceNumber;
    private BigDecimal amount;
    private LocalDateTime issuedDate;
    private String status;
    private String pdfUrl;
}
