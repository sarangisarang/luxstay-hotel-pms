package com.booksys.payment;

import com.booksys.payment.dto.PaymentRequestDTO;
import com.booksys.payment.dto.PaymentResponseDTO;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface PaymentService {

    org.springframework.data.domain.Page<PaymentResponseDTO> getAllPayments(Pageable pageable);

    PaymentResponseDTO savePayment(PaymentRequestDTO requestDTO);

    PaymentResponseDTO getPaymentById(UUID id);

    void deletePayment(UUID paymentId);
    PaymentResponseDTO markAsPaid(UUID paymentId);
    List<PaymentResponseDTO> getPaymentsByBookingId(UUID bookingId);
}
