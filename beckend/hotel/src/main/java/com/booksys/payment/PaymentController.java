package com.booksys.payment;
import com.booksys.payment.dto.PaymentRequestDTO;
import com.booksys.payment.dto.PaymentResponseDTO;
import com.booksys.user.OwnershipService;
import lombok.RequiredArgsConstructor;
import com.booksys.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for managing payments.
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final OwnershipService ownershipService;

    @GetMapping
    public ResponseEntity<PageResponse<PaymentResponseDTO>> getAllPayments(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        size = Math.min(size, 200);
        return ResponseEntity.ok(PageResponse.of(paymentService.getAllPayments(
                PageRequest.of(page, size, Sort.by("paymentDate").descending()))));
    }

    /**
     * Create a new payment.
     */
    @PostMapping
    public ResponseEntity<PaymentResponseDTO> createPayment(
            @Valid @RequestBody PaymentRequestDTO requestDTO) {
        PaymentResponseDTO createdPayment = paymentService.savePayment(requestDTO);
        return ResponseEntity.ok(createdPayment);
    }
    
    /**
     * Retrieve a payment by its ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponseDTO> getPaymentById(@PathVariable UUID id, Authentication auth) {
        ownershipService.requirePaymentAccess(id, auth);
        PaymentResponseDTO payment = paymentService.getPaymentById(id);
        if (payment != null) {
            return ResponseEntity.ok(payment);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete a payment by its ID.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePayment(@PathVariable UUID id) {
        paymentService.deletePayment(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Retrieve payments by booking ID.
     */
    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<List<PaymentResponseDTO>> getPaymentsByBookingId(
            @PathVariable UUID bookingId, Authentication auth) {
        ownershipService.requirePaymentAccessByBooking(bookingId, auth);
        List<PaymentResponseDTO> payments = paymentService.getPaymentsByBookingId(bookingId);
        return ResponseEntity.ok(payments);
    }
}