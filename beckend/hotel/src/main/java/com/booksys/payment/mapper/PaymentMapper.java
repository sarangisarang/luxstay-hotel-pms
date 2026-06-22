package com.booksys.payment.mapper;
import com.booksys.payment.Payment;
import com.booksys.payment.PaymentStatus;
import com.booksys.payment.dto.PaymentRequestDTO;
import com.booksys.payment.dto.PaymentResponseDTO;

/**
 * Mapper class for converting between Payment entities and DTOs.
 */
public class PaymentMapper {

    public static PaymentResponseDTO toDTO(Payment payment) {
        PaymentResponseDTO dto = new PaymentResponseDTO();
        dto.setId(payment.getId());
        dto.setAmount(payment.getAmount());
        dto.setPaymentMethod(payment.getPaymentMethod());
        dto.setBookingId(payment.getBooking().getId());
        dto.setPaymentDate(payment.getPaymentDate().toLocalDate());
        dto.setStatus(String.valueOf(payment.getStatus()));
        dto.setCardNumber(payment.getCardNumber());
        dto.setCvv(payment.getCvv());
        dto.setExpiry(payment.getExpiry());
        dto.setGuestName(payment.getBooking().getGuest().getFirstName() + " " + payment.getBooking().getGuest().getLastName());
        dto.setGuestId(payment.getBooking().getGuest().getId());
        dto.setGuestEmail(payment.getBooking().getGuest().getEmail());
        dto.setGuestAddress(payment.getBooking().getGuest().getAddress());


        return dto;
    }
    public static Payment toEntity(PaymentRequestDTO dto) {
        Payment payment = new Payment();
        payment.setAmount(dto.getAmount());
        payment.setPaymentMethod(dto.getPaymentMethod());
        payment.setPaymentDate(dto.getPaymentDate().atStartOfDay());
        payment.setStatus(PaymentStatus.valueOf(dto.getStatus()));
        payment.setCardNumber(dto.getCardNumber());
        payment.setCvv(dto.getCvv());
        payment.setExpiry(dto.getExpiry());
        return payment;
    }
}

