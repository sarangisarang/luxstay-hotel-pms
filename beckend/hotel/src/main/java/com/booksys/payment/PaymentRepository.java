package com.booksys.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.util.List;
/**
 * Repository interface for Payment entity.
 * Provides basic CRUD operations and custom queries for payments.
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    List<Payment> findByBookingId(UUID bookingId);
    java.util.Optional<Payment> findFirstByBookingId(UUID bookingId);
    boolean existsByIdAndBookingGuestAppUserEmail(UUID id, String email);
    boolean existsByBookingIdAndBookingGuestAppUserEmail(UUID bookingId, String email);

    @org.springframework.data.jpa.repository.Query(
        "select coalesce(sum(p.amount), 0) from Payment p " +
        "where p.status = com.booksys.payment.PaymentStatus.PAID " +
        "and p.paymentDate >= :from and p.paymentDate < :to")
    java.math.BigDecimal sumPaidBetween(
        @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
        @org.springframework.data.repository.query.Param("to")   java.time.LocalDateTime to);

    @org.springframework.data.jpa.repository.Query(
        "select p from Payment p where p.paymentDate >= :from and p.paymentDate < :to order by p.paymentDate desc")
    List<Payment> findByDateRange(
        @org.springframework.data.repository.query.Param("from") java.time.LocalDateTime from,
        @org.springframework.data.repository.query.Param("to")   java.time.LocalDateTime to);
}
