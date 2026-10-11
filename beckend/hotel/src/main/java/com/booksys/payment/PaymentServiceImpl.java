package com.booksys.payment;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingStatus;
import com.booksys.guest.Guest;
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
    private final BookingPaymentSync paymentSync;

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
     * Records a payment for a booking.
     *
     * <p>A booking gets a PENDING placeholder payment when it is created. Money
     * received is written into that placeholder instead of a second row (the
     * old code inserted a second row and failed on a unique constraint). Further
     * payments — a deposit followed by the balance — become additional rows.</p>
     *
     * <p>The booking's payment status and its invoice are then derived from the
     * payment rows by {@link BookingPaymentSync#recalculate(Booking)}.</p>
     *
     * @param requestDTO booking ID, amount, method, optional status (default PAID) and date
     * @return the persisted payment as a DTO
     * @throws EntityNotFoundException  if no booking with the given ID exists
     * @throws IllegalArgumentException if amount, method or status are invalid
     * @throws IllegalStateException    if the booking is cancelled or the amount exceeds the balance
     */
    @Override
    public PaymentResponseDTO savePayment(PaymentRequestDTO requestDTO) {
        if (requestDTO.getBookingId() == null) {
            throw new IllegalArgumentException("Booking is required");
        }
        Booking booking = bookingRepository.findById(requestDTO.getBookingId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Booking not found: " + requestDTO.getBookingId()));
        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Cannot record a payment for a cancelled booking");
        }

        BigDecimal amount = requestDTO.getAmount();
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        String method = requestDTO.getPaymentMethod() == null ? "" : requestDTO.getPaymentMethod().trim();
        if (method.isEmpty()) {
            throw new IllegalArgumentException("Payment method is required");
        }
        PaymentStatus status = parseRecordableStatus(requestDTO.getStatus());

        if (status == PaymentStatus.PAID) {
            BigDecimal outstanding = paymentSync.outstanding(booking);
            if (amount.compareTo(outstanding) > 0) {
                throw new IllegalStateException(outstanding.signum() == 0
                        ? "This booking is already fully paid"
                        : "Amount exceeds the outstanding balance of " + outstanding.toPlainString());
            }
        }

        // Money received completes the open placeholder; anything else is a new row
        Payment payment = status == PaymentStatus.PAID
                ? paymentSync.pendingPlaceholder(booking).orElseGet(() -> BookingPaymentSync.newPaymentFor(booking))
                : BookingPaymentSync.newPaymentFor(booking);
        payment.setAmount(amount);
        payment.setPaymentMethod(method);
        payment.setStatus(status);
        payment.setPaymentDate(requestDTO.getPaymentDate() != null
                ? requestDTO.getPaymentDate().atTime(java.time.LocalTime.now())
                : java.time.LocalDateTime.now());
        payment.setCardLast4(PaymentMapper.lastFour(requestDTO.getCardNumber()));
        Payment saved = paymentRepository.save(payment);

        paymentSync.recalculate(booking);
        return toDTO(saved);
    }

    /** Only PAID (money received) and PENDING (e.g. card terminal pending) can be recorded here. */
    private static PaymentStatus parseRecordableStatus(String raw) {
        if (raw == null || raw.isBlank()) return PaymentStatus.PAID;
        PaymentStatus status;
        try {
            status = PaymentStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown payment status: " + raw);
        }
        if (status != PaymentStatus.PAID && status != PaymentStatus.PENDING) {
            throw new IllegalArgumentException("A new payment can only be PAID or PENDING");
        }
        return status;
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

        // Make sure an invoice exists, then let the booking status and the
        // invoice follow from the payment rows (fully paid → invoice PAID)
        invoiceService.getOrCreateForBooking(booking.getId());
        paymentSync.recalculate(booking);

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
