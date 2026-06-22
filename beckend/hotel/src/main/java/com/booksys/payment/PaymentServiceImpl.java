package com.booksys.payment;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.guest.Guest;
import com.booksys.invoice.InvoiceDTO;
import com.booksys.invoice.InvoiceService;
import com.booksys.loyalty.GuestLoyalty;
import com.booksys.loyalty.GuestLoyaltyRepository;
import com.booksys.loyalty.LoyaltyTier;
import com.booksys.payment.dto.PaymentRequestDTO;
import com.booksys.payment.dto.PaymentResponseDTO;
import com.booksys.payment.mapper.PaymentMapper;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.booksys.payment.mapper.PaymentMapper.toDTO;

/**
 * Default implementation of {@link PaymentService}.
 *
 * <p>Manages payment records and automatically advances the booking lifecycle:
 * when a payment is marked {@link PaymentStatus#PAID}, the parent booking's
 * {@code paymentStatus} is updated and, if the booking is already
 * {@link BookingStatus#CHECKED_OUT}, it transitions to {@link BookingStatus#COMPLETED}.
 * An invoice is also created or updated idempotently via {@link InvoiceService}.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceService invoiceService;
    private final GuestLoyaltyRepository loyaltyRepository;

    /**
     * Returns all payments in the system.
     *
     * @return list of all payments as DTOs; empty if none exist
     */
    @Override
    public Page<PaymentResponseDTO> getAllPayments(Pageable pageable) {
        return paymentRepository.findAll(pageable).map(PaymentMapper::toDTO);
    }

    /**
     * Saves a new payment and links it to the specified booking.
     * If the payment status is {@link PaymentStatus#PAID}, the booking's payment status
     * and — when already checked out — its booking status are advanced automatically.
     *
     * @param requestDTO DTO with payment amount, method, status, and booking ID
     * @return the persisted payment as a DTO
     * @throws EntityNotFoundException if no booking with the given ID exists
     */
    @Override
    public PaymentResponseDTO savePayment(PaymentRequestDTO requestDTO) {
        Booking booking = bookingRepository.findById(requestDTO.getBookingId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found: " + requestDTO.getBookingId()));

        Payment payment = PaymentMapper.toEntity(requestDTO);
        payment.setBooking(booking);
        Payment saved = paymentRepository.save(payment);

        if (payment.getStatus() == PaymentStatus.PAID) {
            booking.setPaymentStatus(PaymentStatus.PAID);
            if (booking.getBookingStatus() == BookingStatus.CHECKED_OUT) {
                booking.setBookingStatus(BookingStatus.COMPLETED);
            }
            bookingRepository.save(booking);
        }

        return toDTO(saved);
    }

    /**
     * Returns a single payment by its UUID, or {@code null} if not found.
     *
     * @param id UUID of the payment
     * @return the payment DTO, or {@code null}
     */
    @Override
    public PaymentResponseDTO getPaymentById(UUID id) {
        return paymentRepository.findById(id)
                .map(PaymentMapper::toDTO)
                .orElse(null);
    }

    /**
     * Permanently deletes a payment by its UUID.
     *
     * @param paymentId UUID of the payment to delete
     * @throws EntityNotFoundException if no payment with the given ID exists
     */
    @Override
    public void deletePayment(UUID paymentId) {
        if (!paymentRepository.existsById(paymentId)) {
            throw new EntityNotFoundException("Payment not found: " + paymentId);
        }
        paymentRepository.deleteById(paymentId);
    }

    /**
     * Returns all payments linked to a specific booking.
     *
     * @param bookingId UUID of the booking
     * @return list of payments for that booking; empty if none
     */
    @Override
    public List<PaymentResponseDTO> getPaymentsByBookingId(UUID bookingId) {
        return paymentRepository.findByBookingId(bookingId)
                .stream()
                .map(PaymentMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Marks a payment as {@link PaymentStatus#PAID}, automatically advances the
     * linked booking's lifecycle, and creates or marks the associated invoice as PAID.
     *
     * @param paymentId UUID of the payment to mark as paid
     * @return updated payment DTO
     * @throws EntityNotFoundException if the payment or its linked booking does not exist
     */
    @Override
    @Transactional
    public PaymentResponseDTO markAsPaid(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new EntityNotFoundException("Payment not found: " + paymentId));

        payment.setStatus(PaymentStatus.PAID);
        payment = paymentRepository.save(payment);

        Booking booking = payment.getBooking();
        if (booking == null) {
            throw new EntityNotFoundException("Payment has no linked booking");
        }

        // Auto-create invoice if it does not exist, then mark it PAID
        InvoiceDTO invoice = invoiceService.getOrCreateForBooking(booking.getId());
        if (!"PAID".equals(invoice.getStatus())) {
            invoiceService.markAsPaid(invoice.getId());
        }

        // Award loyalty points: 1 point per €10 spent
        try {
            Guest guest = booking.getGuest();
            if (guest != null && payment.getAmount() != null) {
                int points = payment.getAmount().divide(BigDecimal.TEN, 0, java.math.RoundingMode.DOWN).intValue();
                if (points > 0) {
                    GuestLoyalty loyalty = loyaltyRepository.findByGuestId(guest.getId())
                            .orElseGet(() -> GuestLoyalty.builder()
                                    .guestId(guest.getId())
                                    .guestEmail(guest.getEmail())
                                    .guestName(guest.getFirstName() + " " + guest.getLastName())
                                    .points(0)
                                    .tier(LoyaltyTier.BRONZE)
                                    .totalStays(0)
                                    .totalSpent(BigDecimal.ZERO)
                                    .build());
                    loyalty.setPoints(loyalty.getPoints() + points);
                    loyalty.setTotalSpent(loyalty.getTotalSpent().add(payment.getAmount()));
                    loyalty.setTier(computeTier(loyalty.getPoints()));
                    loyaltyRepository.save(loyalty);
                }
            }
        } catch (Exception ignored) {}

        return toDTO(payment);
    }

    private static LoyaltyTier computeTier(int points) {
        if (points >= 10000) return LoyaltyTier.PLATINUM;
        if (points >= 5000)  return LoyaltyTier.GOLD;
        if (points >= 1500)  return LoyaltyTier.SILVER;
        return LoyaltyTier.BRONZE;
    }
}
