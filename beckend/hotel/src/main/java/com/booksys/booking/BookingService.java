package com.booksys.booking;

import com.booksys.room.Room;
import com.booksys.room.RoomAvailabilityDTO;
import com.booksys.service.ServiceEntity;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Business-logic contract for all booking operations.
 *
 * <p>Implementations are responsible for:</p>
 * <ul>
 *   <li>Validating input and enforcing date-range / availability constraints</li>
 *   <li>Computing total prices using {@link BigDecimal} arithmetic</li>
 *   <li>Managing the booking lifecycle: PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT → COMPLETED</li>
 *   <li>Synchronizing room status ({@link com.booksys.room.RoomStatus}) with booking transitions</li>
 * </ul>
 */
public interface BookingService {

    /**
     * Returns booked date ranges for every room within a specified window.
     *
     * @param from start of the query window (inclusive); {@code null} defaults to today
     * @param to   end of the query window (exclusive);   {@code null} defaults to from + 90 days
     * @return list of {@link RoomAvailabilityDTO}, one per room
     */
    List<RoomAvailabilityDTO> getAllRoomsAvailability(LocalDate from, LocalDate to);

    /**
     * Returns booked dates for every room with no date filter (all time).
     *
     * @return list of {@link RoomAvailabilityDTO}, one per room
     */
    List<RoomAvailabilityDTO> getAllRoomsAvailability();

    /**
     * Checks whether a room has no active overlapping bookings in the requested range.
     *
     * @param roomId   UUID of the room
     * @param checkIn  requested check-in (inclusive)
     * @param checkOut requested check-out (exclusive)
     * @return {@code true} if the room is free; {@code false} if already booked
     */
    boolean isRoomAvailable(UUID roomId, LocalDate checkIn, LocalDate checkOut);

    /**
     * Creates and persists a new booking, enforcing availability and computing prices.
     *
     * @param bookingDTO input DTO
     * @return the saved booking as a DTO
     */
    BookingDTO createBooking(BookingDTO bookingDTO);

    /**
     * Updates an existing booking's dates, guests, room, and payment status.
     *
     * @param bookingId  UUID of the booking to update
     * @param bookingDTO DTO with updated values
     * @return the updated booking as a DTO
     */
    BookingDTO updateBooking(UUID bookingId, BookingDTO bookingDTO);

    /**
     * Retrieves a single booking by its UUID.
     *
     * @param bookingId UUID of the booking
     * @return the booking as a DTO
     */
    BookingDTO getBookingById(UUID bookingId);

    /**
     * Returns a page of bookings sorted by check-in date descending.
     * Use {@link org.springframework.data.domain.PageRequest} to control page/size.
     */
    Page<BookingDTO> getAllBookings(Pageable pageable);

    List<BookingDTO> getBookingsInRange(LocalDate from, LocalDate to);

    /** Returns all bookings for a specific guest, sorted by check-in date descending. */
    List<BookingDTO> getBookingsByGuest(UUID guestId);

    /**
     * Cancels a booking and frees the associated room.
     *
     * @param bookingId UUID of the booking
     * @return updated booking DTO with status CANCELLED
     */
    BookingDTO cancelBooking(UUID bookingId);

    /**
     * Fetches a room entity by its UUID (used internally by other services).
     *
     * @param id UUID of the room
     * @return the room entity
     */
    Room getRoomById(UUID id);

    /**
     * Permanently removes a booking.
     *
     * @param bookingId UUID of the booking to delete
     */
    void deleteBooking(UUID bookingId);

    /**
     * Transitions a booking to CHECKED_IN and marks the room OCCUPIED.
     *
     * @param bookingId UUID of the booking
     * @return updated booking DTO
     */
    BookingDTO checkIn(UUID bookingId);

    /**
     * Transitions a booking to CHECKED_OUT (or COMPLETED if already paid)
     * and marks the room FREE.
     *
     * @param bookingId UUID of the booking
     * @return updated booking DTO
     */
    BookingDTO checkOut(UUID bookingId);

    /**
     * Calculates the grand total for a booking: room nights + services.
     *
     * @param booking fully populated booking entity
     * @return computed total amount with 2 decimal places
     */
    BigDecimal calculateTotalAmount(Booking booking);

    /**
     * Batch-fetches service entities by their IDs.
     *
     * @param serviceIds list of service UUIDs
     * @return matching service entities
     */
    List<ServiceEntity> getServicesByIds(List<UUID> serviceIds);
}