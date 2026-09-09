package com.booksys.payment.mapper;
import com.booksys.payment.Payment;
import com.booksys.payment.PaymentStatus;
import com.booksys.payment.dto.PaymentRequestDTO;
import com.booksys.payment.dto.PaymentResponseDTO;

/**
 * Mapper class for converting between Payment entities and DTOs.
 */
public class PaymentMapper {

    /**
     * Keeps only the last four digits of a card number. Everything else is
     * dropped here, at the boundary, so no other layer ever sees a full PAN.
     */
    static String lastFour(String cardNumber) {
        if (cardNumber == null) return null;
        String digits = cardNumber.replaceAll("\\D", "");
        return digits.length() < 4 ? null : digits.substring(digits.length() - 4);
    }

    public static PaymentResponseDTO toDTO(Payment payment) {
        PaymentResponseDTO dto = new PaymentResponseDTO();
        dto.setId(payment.getId());
        dto.setAmount(payment.getAmount());
        dto.setPaymentMethod(payment.getPaymentMethod());
        dto.setBookingId(payment.getBooking().getId());
        dto.setPaymentDate(payment.getPaymentDate().toLocalDate());
        dto.setStatus(String.valueOf(payment.getStatus()));
        dto.setCardLast4(payment.getCardLast4());
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
        payment.setCardLast4(lastFour(dto.getCardNumber()));
        return payment;
    }
}

