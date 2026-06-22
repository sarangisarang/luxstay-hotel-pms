package com.booksys.booking;

import com.booksys.guest.Guest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;


/**
 * Repository interface for accessing Booking entities from the database.
 * Uses Spring Data JPA to provide CRUD operations and custom queries.
 */
@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    /**
     * Find all bookings by a specific guest's ID.
     *
     * @param guestId UUID of the guest.
     * @return list of bookings made by the guest.
     */
    List<Booking> findByGuestId(UUID guestId);

    @Query("select b from Booking b where b.guest.id = :guestId " +
           "and b.bookingStatus in (com.booksys.booking.BookingStatus.PENDING, " +
           "com.booksys.booking.BookingStatus.CONFIRMED, " +
           "com.booksys.booking.BookingStatus.CHECKED_IN)")
    List<Booking> findActiveByGuestId(@Param("guestId") UUID guestId);


    @Query("select b from Booking b " +
            "where b.room.id = :roomId " +
            "and b.bookingStatus <> :cancelled " +
            "and b.checkInDate < :to " +
            "and b.checkOutDate > :from")
    List<Booking> findOverlapping(@Param("roomId") UUID roomId,
                                  @Param("from") LocalDate from,
                                  @Param("to") LocalDate to,
                                  @Param("cancelled") BookingStatus cancelled);

    // overlap for all rooms (half-open [from, to))
    @Query("select b from Booking b " +
            "where b.bookingStatus <> com.booksys.booking.BookingStatus.CANCELLED " +
            "and b.checkInDate < :to " +
            "and b.checkOutDate > :from")
    List<Booking> findAllOverlapping(@Param("from") LocalDate from,
                                     @Param("to") LocalDate to);


    @Query("SELECT b FROM Booking b WHERE b.room.id = :roomId AND " +
            "(b.checkInDate < :checkOutDate AND b.checkOutDate > :checkInDate)")
    List<Booking> findByRoomIdAndDateRange(
            @Param("roomId") UUID roomId,
            @Param("checkInDate") LocalDate checkInDate,
            @Param("checkOutDate") LocalDate checkOutDate);

    @Query("""
            SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END
            FROM Booking b
            WHERE b.room.id = :roomId
              AND b.bookingStatus <> com.booksys.booking.BookingStatus.CANCELLED
              AND b.checkInDate < :checkOut
              AND b.checkOutDate > :checkIn
            """)
    boolean existsOverlappingBooking(
            @Param("roomId") UUID roomId,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut);

    @EntityGraph(attributePaths = {"guest","room"})
    List<Booking> findAll();

    @NonNull
    @EntityGraph(attributePaths = {"guest","room"})
    Page<Booking> findAll(@NonNull Pageable pageable);
    /**
     * Find all bookings for a specific room.
     *
     * @param roomId UUID of the room.
     * @return list of bookings associated with the room.
     */
    List<Booking> findByRoomId(UUID roomId);
    List<Booking> findTopByGuestOrderByCheckInDateDesc(Guest guest);
    Optional<Booking> findTopByGuestIdOrderByCheckInDateDesc(UUID guestId);
    Optional<Booking> findById(UUID uuid);

    Optional<Booking> findByStripePaymentIntentId(String stripePaymentIntentId);

    @Query("select b from Booking b where b.guest.email = :email order by b.checkInDate desc")
    List<Booking> findByGuestEmail(@Param("email") String email);

    /** All bookings whose scheduled check-out date is before today and are still CONFIRMED/CHECKED_IN. */
    @Query("select b from Booking b where b.checkOutDate < :today " +
           "and b.bookingStatus in (com.booksys.booking.BookingStatus.CONFIRMED, " +
           "com.booksys.booking.BookingStatus.CHECKED_IN)")
    List<Booking> findOverdueBookings(@Param("today") LocalDate today);

    @Query("select count(b) from Booking b where b.bookingStatus in :statuses")
    long countByBookingStatusIn(@Param("statuses") java.util.Collection<BookingStatus> statuses);

    boolean existsByIdAndGuestAppUserEmail(UUID id, String email);

    @Query("select b from Booking b where b.bookingStatus in :statuses " +
           "and b.checkInDate is not null and b.checkOutDate is not null")
    List<Booking> findByBookingStatusIn(@Param("statuses") java.util.Collection<BookingStatus> statuses);

    long countByBookingStatus(BookingStatus status);
    long countByCheckInDateAndBookingStatusNot(LocalDate date, BookingStatus status);
    long countByCheckOutDateAndBookingStatusNot(LocalDate date, BookingStatus status);
    long countByCheckInDateBetweenAndBookingStatusNot(LocalDate from, LocalDate to, BookingStatus status);
    List<Booking> findByRoomIdIn(Collection<UUID> roomIds);

    @Query("SELECT COALESCE(AVG(b.totalAmount), 0) FROM Booking b WHERE b.totalAmount IS NOT NULL AND b.bookingStatus <> :status")
    BigDecimal avgTotalAmountExcluding(@Param("status") BookingStatus status);

    @Query("SELECT b FROM Booking b WHERE b.bookingStatus <> :status AND b.checkInDate IS NOT NULL AND b.checkOutDate IS NOT NULL")
    List<Booking> findActiveWithDates(@Param("status") BookingStatus status);

    @Query("SELECT b FROM Booking b WHERE b.room.hotel.id = :hotelId")
    List<Booking> findByHotelId(@Param("hotelId") UUID hotelId);

    List<Booking> findByCheckInDateAndBookingStatusNot(LocalDate date, BookingStatus status);
    List<Booking> findByCheckOutDateAndBookingStatusNot(LocalDate date, BookingStatus status);
    List<Booking> findByCheckInDateAndBookingStatusIn(LocalDate date, Collection<BookingStatus> statuses);

    // Night audit: stayovers on a given date (checked in before, checking out after)
    @Query("SELECT b FROM Booking b WHERE b.checkInDate < :date AND b.checkOutDate > :date AND b.bookingStatus <> :status")
    List<Booking> findStayoversOnDate(@Param("date") LocalDate date, @Param("status") BookingStatus status);

    // Night audit / booking-trends: bookings created within a datetime window
    long countByCreatedAtBetween(java.time.LocalDateTime from, java.time.LocalDateTime to);
    long countByBookingStatusAndCreatedAtBetween(BookingStatus status, java.time.LocalDateTime from, java.time.LocalDateTime to);

    // Batch 2: non-cancelled bookings (no date filter) for channel/repeat-guest analytics
    @Query("SELECT b FROM Booking b WHERE b.bookingStatus <> :status")
    List<Booking> findByBookingStatusNot(@Param("status") BookingStatus status);

    // Revenue by channel: DB-level GROUP BY to avoid full table scan in Java
    @Query("SELECT b.bookingSource, COUNT(b), COALESCE(SUM(b.totalAmount), 0) " +
           "FROM Booking b WHERE b.bookingStatus <> :status " +
           "GROUP BY b.bookingSource ORDER BY SUM(b.totalAmount) DESC")
    List<Object[]> revenueGroupedByChannel(@Param("status") BookingStatus status);

    // CRM segments: guest emails of guests with >= minBookings non-cancelled bookings
    @Query("SELECT b.guest.email FROM Booking b " +
           "WHERE b.guest IS NOT NULL AND b.guest.email IS NOT NULL " +
           "AND b.bookingStatus <> com.booksys.booking.BookingStatus.CANCELLED " +
           "GROUP BY b.guest.email HAVING COUNT(b) >= :minBookings")
    List<String> findVipGuestEmails(@Param("minBookings") long minBookings);
}
