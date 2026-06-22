package com.booksys.booking;

import com.booksys.email.BookingEmailData;
import com.booksys.email.EmailService;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import com.booksys.auditlog.ChangeLogService;
import com.booksys.invoice.InvoiceRepository;
import com.booksys.invoice.InvoiceStatus;
import com.booksys.notification.NotificationService;
import com.booksys.payment.Payment;
import com.booksys.payment.PaymentRepository;
import com.booksys.payment.PaymentStatus;
import com.booksys.pricing.DynamicPricingService;
import com.booksys.room.RoomAvailabilityDTO;
import com.booksys.room.Room;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import com.booksys.roomtype.RoomType;
import com.booksys.service.ServiceEntity;
import com.booksys.service.ServiceRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Primary implementation of {@link BookingService}.
 *
 * <p>Handles all booking lifecycle operations: creation, updates, check-in, check-out,
 * and cancellation. Price calculation is performed in-process using BigDecimal arithmetic
 * with HALF_UP rounding. Room availability is enforced via an overlap query that excludes
 * CANCELLED bookings.</p>
 *
 * <p>All mutating methods are wrapped in a JTA {@link Transactional} boundary so that
 * booking and room-status changes are committed or rolled back atomically.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final GuestRepository guestRepository;
    private final RoomRepository roomRepository;
    private final ServiceRepository serviceRepository;
    private final BookingMapper bookingMapper;
    private final DynamicPricingService dynamicPricingService;
    private final EmailService emailService;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final NotificationService notificationService;
    private final ChangeLogService changeLogService;

    /**
     * Validates that the given room has no non-cancelled bookings overlapping
     * the requested date range. Optionally ignores one booking ID (used when
     * updating an existing booking so it does not conflict with itself).
     *
     * @param roomId          UUID of the room to check
     * @param checkIn         requested check-in date (inclusive)
     * @param checkOut        requested check-out date (exclusive)
     * @param ignoreBookingId UUID of the booking to exclude from the check, or {@code null}
     * @throws IllegalStateException if a conflicting booking exists
     */
    private void assertRoomIsFree(UUID roomId, LocalDate checkIn, LocalDate checkOut, UUID ignoreBookingId) {
        List<Booking> overlaps = bookingRepository.findOverlapping(
                roomId, checkIn, checkOut, BookingStatus.CANCELLED
        );

        boolean conflict = overlaps.stream().anyMatch(b ->
                ignoreBookingId == null || !b.getId().equals(ignoreBookingId)
        );

        if (conflict) {
            throw new IllegalStateException("Room is not available for the selected dates.");
        }
    }

    /**
     * Creates a new booking after validating input, checking room availability,
     * and computing the total price (room nights + optional services).
     *
     * <p>Availability is verified <em>before</em> any persistence call to avoid
     * writing a conflicting booking and then rolling back.</p>
     *
     * @param bookingDTO DTO carrying guest ID, room ID, date range, and optional service IDs
     * @return persisted booking as a DTO
     * @throws IllegalArgumentException if required fields are null or the date range is invalid
     * @throws IllegalStateException    if the room is already booked for the requested period
     *                                  or has no room type assigned
     * @throws jakarta.persistence.EntityNotFoundException if the guest or room does not exist
     */
    @Override
    public BookingDTO createBooking(BookingDTO bookingDTO) {

        // ===== Null validation =====
        if (bookingDTO.getGuestId() == null) throw new IllegalArgumentException("Guest ID must not be null");
        if (bookingDTO.getRoomId() == null)  throw new IllegalArgumentException("Room ID must not be null");
        if (bookingDTO.getCheckInDate() == null || bookingDTO.getCheckOutDate() == null) {
            throw new IllegalArgumentException("Check-in and Check-out dates must not be null");
        }

        LocalDate checkInDate  = bookingDTO.getCheckInDate();
        LocalDate checkOutDate = bookingDTO.getCheckOutDate();

        // ===== Date range validation =====
        long nights = ChronoUnit.DAYS.between(checkInDate, checkOutDate);
        if (nights <= 0) {
            throw new IllegalArgumentException("Check-out date must be after check-in date (at least 1 night).");
        }
        if (checkInDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Check-in date cannot be in the past.");
        }

        // ===== Fetch related entities =====
        Guest guest = guestRepository.findById(bookingDTO.getGuestId())
                .orElseThrow(() -> new EntityNotFoundException("Guest not found: " + bookingDTO.getGuestId()));

        // Pessimistic write lock on Room — serialises concurrent booking attempts for the same room
        Room room = roomRepository.findByIdForUpdate(bookingDTO.getRoomId())
                .orElseThrow(() -> new EntityNotFoundException("Room not found: " + bookingDTO.getRoomId()));

        RoomType roomType = room.getRoomType();
        if (roomType == null) {
            throw new IllegalStateException("Room type is not assigned to the selected room.");
        }

        List<ServiceEntity> services = (bookingDTO.getServiceIds() == null || bookingDTO.getServiceIds().isEmpty())
                ? new ArrayList<>()
                : serviceRepository.findAllById(bookingDTO.getServiceIds());

        // Overlap check runs under the pessimistic lock — safe against concurrent requests
        if (bookingRepository.existsOverlappingBooking(room.getId(), checkInDate, checkOutDate)) {
            throw new IllegalStateException("Room is not available for the selected dates.");
        }

        // ===== Price calculation (dynamic pricing: weekend + peak-season uplifts) =====
        final int scale = 2;
        final RoundingMode rm = RoundingMode.HALF_UP;

        BigDecimal pricePerNight = roomType.getPricePerNight() == null
                ? BigDecimal.ZERO
                : roomType.getPricePerNight().setScale(scale, rm);

        BigDecimal roomTotal = dynamicPricingService.calculateTotal(pricePerNight, checkInDate, checkOutDate);

        BigDecimal servicesTotal = services.stream()
                .map(s -> s.getPrice() == null ? BigDecimal.ZERO : s.getPrice())
                .map(p -> p.setScale(scale, rm))
                .reduce(BigDecimal.ZERO.setScale(scale, rm), BigDecimal::add);

        BigDecimal total = roomTotal.add(servicesTotal).setScale(scale, rm);

        // ===== Build & persist =====
        Booking booking = bookingMapper.toEntity(bookingDTO, guest, room, services);
        booking.setGuest(guest);
        booking.setBookingStatus(
                bookingDTO.getBookingStatus() != null ? bookingDTO.getBookingStatus() : BookingStatus.PENDING
        );
        booking.setTotalServiceAmount(servicesTotal);
        booking.setTotalAmount(total);
        booking.setPaymentStatus(PaymentStatus.PENDING);
        if (bookingDTO.getBookingSource() != null) booking.setBookingSource(bookingDTO.getBookingSource());
        if (bookingDTO.getSpecialRequests() != null) booking.setSpecialRequests(bookingDTO.getSpecialRequests());

        room.setRoomStatus(RoomStatus.RESERVED);
        roomRepository.save(room);

        BookingDTO result = bookingMapper.toDto(bookingRepository.save(booking));

        // Create a PENDING payment record so it appears in the payments list from day one
        Payment payment = Payment.builder()
                .amount(booking.getTotalAmount())
                .paymentMethod("RECEPTION")
                .paymentDate(java.time.LocalDateTime.now())
                .status(PaymentStatus.PENDING)
                .booking(booking)
                .guestId(guest.getId())
                .guestName(guest.getFirstName() + " " + guest.getLastName())
                .guestEmail(guest.getEmail())
                .build();
        paymentRepository.save(payment);

        try {
            long emailNights = booking.getCheckOutDate().toEpochDay() - booking.getCheckInDate().toEpochDay();
            String hotelName = room.getHotel() != null ? room.getHotel().getName() : "LuxStay";
            emailService.sendBookingConfirmation(new BookingEmailData(
                    booking.getId().toString().substring(0, 8).toUpperCase(),
                    guest.getEmail(),
                    guest.getFirstName() + " " + guest.getLastName(),
                    hotelName,
                    String.valueOf(room.getRoomNumber()),
                    booking.getCheckInDate(),
                    booking.getCheckOutDate(),
                    emailNights,
                    booking.getTotalAmount()
            ));
        } catch (Exception e) {
            log.warn("Booking confirmation email failed for booking {}: {}", booking.getId(), e.getMessage(), e);
        }

        try {
            Guest g = booking.getGuest();
            String gName = g != null ? g.getFirstName() + " " + g.getLastName() : "Guest";
            notificationService.create("BOOKING_CREATED", "New Booking",
                    "Booking #" + result.getId().toString().substring(0, 8).toUpperCase() +
                    " created for " + gName + " — " + booking.getCheckInDate() + " → " + booking.getCheckOutDate(),
                    "RECEPTION");
        } catch (Exception e) {
            log.warn("Notification failed after booking create {}: {}", result.getId(), e.getMessage(), e);
        }

        try {
            changeLogService.log("Booking", result.getId().toString(), "CREATE",
                    "SYSTEM", "ADMIN",
                    "Booking created for guest " + bookingDTO.getGuestId() +
                    " room " + bookingDTO.getRoomId() +
                    " " + bookingDTO.getCheckInDate() + "–" + bookingDTO.getCheckOutDate(),
                    null, "CONFIRMED");
        } catch (Exception e) {
            log.warn("Audit log failed after booking create {}: {}", result.getId(), e.getMessage(), e);
        }

        return result;
    }
    /**
     * Returns booked date ranges for every room within the given window.
     * If {@code from} or {@code to} is {@code null}, defaults to today and today+90 days
     * respectively, providing a useful 90-day look-ahead.
     *
     * @param from start of the query window (inclusive); {@code null} → today
     * @param to   end of the query window (exclusive);   {@code null} → from + 90 days
     * @return one {@link RoomAvailabilityDTO} per room, each containing a list of
     *         booked {@link LocalDate}s within the window
     */
    @Override
    public List<RoomAvailabilityDTO> getAllRoomsAvailability(LocalDate from, LocalDate to) {
        if (from == null) from = LocalDate.now();
        if (to == null)   to   = from.plusDays(90); // half-open [from, to)

        List<Booking> overlapping = bookingRepository.findAllOverlapping(from, to);

        Map<UUID, List<Booking>> byRoom = new HashMap<>();
        for (Booking b : overlapping) {
            byRoom.computeIfAbsent(b.getRoom().getId(), k -> new ArrayList<>()).add(b);
        }

        List<Room> rooms = roomRepository.findAll();
        List<RoomAvailabilityDTO> out = new ArrayList<>(rooms.size());

        for (Room room : rooms) {
            List<Booking> bookings = byRoom.getOrDefault(room.getId(), Collections.emptyList());

            Set<LocalDate> dates = new LinkedHashSet<>();
            for (Booking booking : bookings) {
                LocalDate start = booking.getCheckInDate();
                LocalDate endExclusive = booking.getCheckOutDate();

                LocalDate s = start.isBefore(from) ? from : start;
                LocalDate e = endExclusive.isAfter(to) ? to : endExclusive;

                for (LocalDate d = s; d.isBefore(e); d = d.plusDays(1)) {
                    dates.add(d);
                }
            }

            RoomAvailabilityDTO dto = new RoomAvailabilityDTO();
            dto.setRoomId(room.getId());
            dto.setRoomNumber(String.valueOf(room.getRoomNumber()));
            dto.setBookedDates(new ArrayList<>(dates));
            out.add(dto);
        }

        return out;
    }


    /**
     * Returns booked dates for every room with no date-range filter.
     * Iterates all bookings per room and expands date ranges into individual dates.
     *
     * @return one {@link RoomAvailabilityDTO} per room listing all historically booked dates
     */
    @Override
    public List<RoomAvailabilityDTO> getAllRoomsAvailability() {

        List<Room> rooms = roomRepository.findAll();
        List<RoomAvailabilityDTO> result = new ArrayList<>();

        for (Room room : rooms) {
            List<Booking> bookings = bookingRepository.findByRoomId(room.getId());
            List<LocalDate> dates = new ArrayList<>();

            for (Booking booking : bookings) {
                LocalDate start = booking.getCheckInDate();
                LocalDate end = booking.getCheckOutDate().minusDays(1);
                while (!start.isAfter(end)) {
                    dates.add(start);
                    start = start.plusDays(1);
                }
            }


            RoomAvailabilityDTO dto = new RoomAvailabilityDTO();
            dto.setRoomId(room.getId());
            dto.setRoomNumber(String.valueOf(room.getRoomNumber()));
            dto.setBookedDates(dates);

            result.add(dto);
        }

        return result;
    }
    /**
     * Checks whether a room is available for the requested date range.
     * CANCELLED bookings are excluded from the overlap check.
     *
     * @param roomId   UUID of the room to check
     * @param checkIn  requested check-in date (inclusive)
     * @param checkOut requested check-out date (exclusive)
     * @return {@code true} if no active booking overlaps the range; {@code false} otherwise
     */
    @Override
    public boolean isRoomAvailable(UUID roomId, LocalDate checkIn, LocalDate checkOut) {
        return bookingRepository.findOverlapping(
                roomId, checkIn, checkOut, BookingStatus.CANCELLED
        ).isEmpty();
    }

    /**
     * Retrieves a batch of {@link ServiceEntity} objects by their IDs.
     *
     * @param serviceIds list of service UUIDs to fetch
     * @return matching service entities (order not guaranteed)
     */
    @Override
    public List<ServiceEntity> getServicesByIds(List<UUID> serviceIds) {
        return serviceRepository.findAllById(serviceIds);
    }

    /**
     * Calculates the grand total for a booking: (nights × room price/night) + sum of service prices.
     * All arithmetic uses {@link BigDecimal} with {@link RoundingMode#HALF_UP} at 2 decimal places.
     *
     * @param booking a fully populated {@link Booking} with room, room type, dates, and services
     * @return the computed total amount
     * @throws IllegalArgumentException if check-out is not after check-in
     * @throws NullPointerException     if the room or room type's pricePerNight is not set
     */
    @Override
    public BigDecimal calculateTotalAmount(Booking booking) {
        final int SCALE = 2;
        final RoundingMode RM = RoundingMode.HALF_UP;

        long nights = ChronoUnit.DAYS.between(booking.getCheckInDate(), booking.getCheckOutDate());
        if (nights <= 0) {
            throw new IllegalArgumentException("Check-out date must be after check-in date (at least 1 night).");
        }

        BigDecimal pricePerNight = booking.getRoom()
                .getRoomType()
                .getPricePerNight()
                .setScale(SCALE, RM);

        BigDecimal roomTotal = dynamicPricingService.calculateTotal(
                pricePerNight, booking.getCheckInDate(), booking.getCheckOutDate());

        BigDecimal servicesTotal = (booking.getServices() == null ? List.<ServiceEntity>of() : booking.getServices())
                .stream()
                .map(s -> s.getPrice() == null ? BigDecimal.ZERO : s.getPrice())
                .map(p -> p.setScale(SCALE, RM))
                .reduce(BigDecimal.ZERO.setScale(SCALE, RM), BigDecimal::add);

        return roomTotal.add(servicesTotal).setScale(SCALE, RM);
    }

    /**
     * Fetches a {@link Room} by its UUID.
     *
     * @param id UUID of the room
     * @return the room entity
     * @throws EntityNotFoundException if no room with the given ID exists
     */
    @Override
    public Room getRoomById(UUID id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Room not found: " + id));
    }

    /**
     * Updates an existing booking's dates, payment status, guest, and room.
     * Availability is re-validated (ignoring the booking being updated) before
     * any changes are persisted.
     *
     * @param bookingId  UUID of the booking to update
     * @param bookingDTO DTO carrying the new field values
     * @return updated booking as a DTO
     * @throws EntityNotFoundException if the booking, guest, or room does not exist
     * @throws IllegalStateException   if the new date range conflicts with another booking
     */
    @Override
    public BookingDTO updateBooking(UUID bookingId, BookingDTO bookingDTO) {
        Booking existing = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + bookingId));

        // Capture original values BEFORE any mutation so fallback reads are correct
        UUID     originalRoomId  = existing.getRoom() != null ? existing.getRoom().getId() : null;
        LocalDate originalCheckIn  = existing.getCheckInDate();
        LocalDate originalCheckOut = existing.getCheckOutDate();

        UUID     roomId  = bookingDTO.getRoomId()       != null ? bookingDTO.getRoomId()       : originalRoomId;
        LocalDate from   = bookingDTO.getCheckInDate()  != null ? bookingDTO.getCheckInDate()  : originalCheckIn;
        LocalDate to     = bookingDTO.getCheckOutDate() != null ? bookingDTO.getCheckOutDate() : originalCheckOut;

        assertRoomIsFree(roomId, from, to, bookingId);

        existing.setCheckInDate(from);
        existing.setCheckOutDate(to);
        existing.setTotalAmount(bookingDTO.getTotalAmount());
        if (bookingDTO.getPaymentStatus() != null) {
            existing.setPaymentStatus(bookingDTO.getPaymentStatus());
        }

        if (bookingDTO.getGuestId() != null) {
            existing.setGuest(guestRepository.findById(bookingDTO.getGuestId())
                    .orElseThrow(() -> new EntityNotFoundException("Guest not found: " + bookingDTO.getGuestId())));
        }
        if (bookingDTO.getRoomId() != null) {
            existing.setRoom(roomRepository.findById(bookingDTO.getRoomId())
                    .orElseThrow(() -> new EntityNotFoundException("Room not found: " + bookingDTO.getRoomId())));
        }

        return bookingMapper.toDto(bookingRepository.save(existing));
    }

    /**
     * Returns a single booking by its UUID.
     *
     * @param bookingId UUID of the booking
     * @return the booking as a DTO
     * @throws EntityNotFoundException if no booking with the given ID exists
     */
    @Override
    public BookingDTO getBookingById(UUID bookingId) {
        return bookingMapper.toDto(bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + bookingId)));
    }

    /**
     * Returns a page of bookings with guest and room associations eager-loaded.
     * Callers control page/size/sort via the {@link Pageable} argument.
     */
    @Override
    public Page<BookingDTO> getAllBookings(Pageable pageable) {
        return bookingRepository.findAll(pageable).map(bookingMapper::toDto);
    }

    @Override
    public List<BookingDTO> getBookingsInRange(LocalDate from, LocalDate to) {
        return bookingRepository.findAllOverlapping(from, to)
                .stream().map(bookingMapper::toDto).toList();
    }

    /**
     * Returns all bookings for a specific guest, sorted by check-in date descending.
     * Uses a targeted query — does NOT load all bookings into memory.
     */
    @Override
    public List<BookingDTO> getBookingsByGuest(UUID guestId) {
        return bookingRepository.findByGuestId(guestId).stream()
                .map(bookingMapper::toDto)
                .sorted(Comparator.comparing(BookingDTO::getCheckInDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    /**
     * Permanently deletes a booking by its UUID.
     *
     * @param bookingId UUID of the booking to delete
     * @throws EntityNotFoundException if no booking with the given ID exists
     */
    @Override
    public void deleteBooking(UUID bookingId) {
        if (!bookingRepository.existsById(bookingId)) {
            throw new EntityNotFoundException("Booking not found: " + bookingId);
        }
        bookingRepository.deleteById(bookingId);
    }

    /**
     * Transitions a booking to {@link BookingStatus#CHECKED_IN} and marks the room as
     * {@link com.booksys.room.RoomStatus#OCCUPIED}.
     *
     * <p>This method is idempotent: if the booking is already CHECKED_IN the current
     * state is returned without modification.</p>
     *
     * @param bookingId UUID of the booking
     * @return updated booking DTO
     * @throws EntityNotFoundException if the booking does not exist
     * @throws IllegalStateException   if the booking is CANCELLED or has no room assigned
     */
    @Override
    @Transactional
    public BookingDTO checkIn(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + bookingId));


        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Cannot check in a cancelled booking.");
        }
        if (booking.getBookingStatus() == BookingStatus.CHECKED_IN) {
            return bookingMapper.toDto(booking);
        }
        if (booking.getRoom() == null) {
            throw new IllegalStateException("Cannot check in: booking has no room assigned. Please set roomId first.");
        }

        // Date window guard: today must be in [checkInDate, checkOutDate - 1]
        // Blocks check-in 30+ days early or after the guest was supposed to have left.
        LocalDate today = LocalDate.now();
        if (today.isBefore(booking.getCheckInDate())) {
            throw new IllegalStateException(
                "Too early to check in. Booking starts on " + booking.getCheckInDate() + ".");
        }
        if (!today.isBefore(booking.getCheckOutDate())) {
            throw new IllegalStateException(
                "Check-in refused: booking check-out date (" + booking.getCheckOutDate() + ") has already passed.");
        }

        booking.setBookingStatus(BookingStatus.CHECKED_IN);

        Room room = booking.getRoom();
        room.setRoomStatus(RoomStatus.OCCUPIED);

        roomRepository.save(room);
        bookingRepository.save(booking);

        try {
            Guest g = booking.getGuest();
            String gName = g != null ? g.getFirstName() + " " + g.getLastName() : "Guest";
            notificationService.create("GUEST_CHECKIN", "Guest Checked In",
                    gName + " checked into room " + (room.getRoomNumber()) +
                    " (Booking #" + booking.getId().toString().substring(0, 8).toUpperCase() + ")",
                    "RECEPTION");
        } catch (Exception e) {
            log.warn("Notification failed after check-in for booking {}: {}", bookingId, e.getMessage(), e);
        }

        try {
            changeLogService.log("Booking", bookingId.toString(), "STATUS_CHANGE",
                    "SYSTEM", "RECEPTION", "Guest checked in",
                    "CONFIRMED", "CHECKED_IN");
        } catch (Exception e) {
            log.warn("Audit log failed after check-in for booking {}: {}", bookingId, e.getMessage(), e);
        }

        return bookingMapper.toDto(booking);
    }

    /**
     * Cancels a booking atomically: marks the booking CANCELLED, releases the room
     * (only if RESERVED), syncs payment and invoice statuses to accounting-safe values,
     * then writes an audit entry.
     *
     * <p>Idempotent: if the booking is already CANCELLED, returns immediately without
     * writing any secondary updates.</p>
     *
     * <p>Payment state machine:
     * PENDING → CANCELLED | COMPLETED → REFUND_REQUIRED | others → unchanged</p>
     *
     * <p>Invoice state machine:
     * GENERATED/UNPAID/SENT → CANCELLED | PAID → CREDIT_NOTE_REQUIRED | others → unchanged</p>
     *
     * @param bookingId UUID of the booking to cancel
     * @return updated booking DTO with status {@link BookingStatus#CANCELLED}
     * @throws EntityNotFoundException if the booking does not exist
     * @throws IllegalStateException   if the booking is CHECKED_IN (use check-out instead)
     */
    @Override
    @Transactional
    public BookingDTO cancelBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + bookingId));

        // Idempotent — no duplicate audit spam or double-refund triggers
        if (booking.getBookingStatus() == BookingStatus.CANCELLED) {
            return bookingMapper.toDto(booking);
        }

        // Business rule: checked-in guests must check out, not cancel
        if (booking.getBookingStatus() == BookingStatus.CHECKED_IN) {
            throw new IllegalStateException("Cannot cancel a checked-in booking. Use check-out.");
        }

        booking.setBookingStatus(BookingStatus.CANCELLED);

        // Free the room only when it is RESERVED — do not blindly free an OCCUPIED room
        Room room = booking.getRoom();
        if (room != null && room.getRoomStatus() == RoomStatus.RESERVED) {
            room.setRoomStatus(RoomStatus.FREE);
            roomRepository.save(room);
        }

        syncPaymentsAfterCancellation(booking);
        syncInvoicesAfterCancellation(booking);

        bookingRepository.save(booking);

        try {
            Guest guest = booking.getGuest();
            String hotelName = room != null && room.getHotel() != null ? room.getHotel().getName() : "LuxStay";
            if (guest != null) {
                emailService.sendBookingCancellation(new BookingEmailData(
                        booking.getId().toString().substring(0, 8).toUpperCase(),
                        guest.getEmail(),
                        guest.getFirstName() + " " + guest.getLastName(),
                        hotelName,
                        room != null ? String.valueOf(room.getRoomNumber()) : "—",
                        booking.getCheckInDate(),
                        booking.getCheckOutDate(),
                        0L,
                        null
                ));
            }
        } catch (Exception e) {
            log.warn("Cancellation email failed for booking {}: {}", bookingId, e.getMessage(), e);
        }

        try {
            Guest g = booking.getGuest();
            String gName = g != null ? g.getFirstName() + " " + g.getLastName() : "Guest";
            notificationService.create("BOOKING_CANCELLED", "Booking Cancelled",
                    "Booking #" + booking.getId().toString().substring(0, 8).toUpperCase() +
                    " for " + gName + " was cancelled.",
                    "RECEPTION");
        } catch (Exception e) {
            log.warn("Notification failed after cancel for booking {}: {}", bookingId, e.getMessage(), e);
        }

        try {
            changeLogService.log("Booking", bookingId.toString(), "STATUS_CHANGE",
                    "SYSTEM", "RECEPTION", "Booking cancelled — payments and invoice synced",
                    "CONFIRMED", "CANCELLED");
        } catch (Exception e) {
            log.warn("Audit log failed after cancel for booking {}: {}", bookingId, e.getMessage(), e);
        }

        return bookingMapper.toDto(booking);
    }

    /**
     * Brings all payments for a cancelled booking into a consistent accounting state.
     * PENDING payments are voided (CANCELLED). COMPLETED payments flag REFUND_REQUIRED —
     * they are NOT automatically marked REFUNDED because no actual money movement has occurred.
     */
    private void syncPaymentsAfterCancellation(Booking booking) {
        List<Payment> payments = paymentRepository.findByBookingId(booking.getId());

        // Track the "worst" status to mirror on the denormalized booking.paymentStatus field
        boolean anyPaid    = false;
        boolean anyPending = false;

        for (Payment p : payments) {
            switch (p.getStatus()) {
                case PENDING -> { p.setStatus(PaymentStatus.CANCELLED); anyPending = true; }
                case PAID    -> { p.setStatus(PaymentStatus.REFUND_REQUIRED); anyPaid = true; }
                default      -> { /* FAILED / REFUNDED / UNPAID / CANCELLED / REFUND_REQUIRED — unchanged */ }
            }
        }
        if (!payments.isEmpty()) {
            paymentRepository.saveAll(payments);
        }

        // Mirror the "worst" state onto the denormalized booking.paymentStatus.
        // Priority: PAID (real money) → REFUND_REQUIRED beats PENDING → CANCELLED.
        // anyPaid is checked first so a mixed PAID+PENDING scenario always resolves to REFUND_REQUIRED.
        if (anyPaid) {
            booking.setPaymentStatus(PaymentStatus.REFUND_REQUIRED);
        } else if (anyPending) {
            booking.setPaymentStatus(PaymentStatus.CANCELLED);
        }
        // No payments existed → booking.paymentStatus stays as-is
    }

    /**
     * Brings all invoices for a cancelled booking into a consistent accounting state.
     * GENERATED/UNPAID/SENT invoices are cancelled outright. PAID invoices are flagged
     * CREDIT_NOTE_REQUIRED — the invoice remains as an accounting record; a credit note
     * must be issued separately.
     */
    private void syncInvoicesAfterCancellation(Booking booking) {
        invoiceRepository.findByBookingId(booking.getId()).ifPresent(invoice -> {
            switch (invoice.getStatus()) {
                case GENERATED, UNPAID, SENT -> invoice.setStatus(InvoiceStatus.CANCELLED);
                case PAID                    -> invoice.setStatus(InvoiceStatus.CREDIT_NOTE_REQUIRED);
                default -> { /* CANCELLED / CREDIT_NOTE_REQUIRED — unchanged */ }
            }
            invoiceRepository.save(invoice);
        });
    }

    /**
     * Transitions a booking to {@link BookingStatus#CHECKED_OUT} (or {@link BookingStatus#COMPLETED}
     * when the payment is already {@link PaymentStatus#PAID}) and frees the room.
     *
     * <p>This method is idempotent for already-checked-out or completed bookings.</p>
     *
     * @param bookingId UUID of the booking
     * @return updated booking DTO
     * @throws EntityNotFoundException if the booking does not exist
     * @throws IllegalStateException   if the booking is not in {@link BookingStatus#CHECKED_IN} state
     *                                 or has no room assigned
     */
    @Override
    @Transactional
    public BookingDTO checkOut(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + bookingId));

        // Idempotency / invalid transitions
        if (booking.getBookingStatus() == BookingStatus.COMPLETED) {
            return bookingMapper.toDto(booking); // already finalized
        }
        if (booking.getBookingStatus() == BookingStatus.CHECKED_OUT) {
            return bookingMapper.toDto(booking); // already checked out (awaiting payment or already paid)
        }
        if (booking.getBookingStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalStateException("Cannot check out when status is " + booking.getBookingStatus());
        }

        // Do NOT overwrite the scheduled check-out date — it is the contractual end date.
        // Actual physical departure is recorded implicitly by the CHECKED_OUT status.

        // Status transition
        if (booking.getPaymentStatus() == PaymentStatus.PAID) {
            // Paid at/ before checkout → finalize immediately
            booking.setBookingStatus(BookingStatus.COMPLETED);
        } else {
            booking.setBookingStatus(BookingStatus.CHECKED_OUT);
            // make the state explicit
            booking.setPaymentStatus(PaymentStatus.UNPAID);
        }

        // Free the room
        Room room = booking.getRoom();
        if (room == null) throw new IllegalStateException("Booking has no room assigned.");
        room.setRoomStatus(RoomStatus.FREE);

        bookingRepository.save(booking);
        roomRepository.save(room);

        try {
            notificationService.create("GUEST_CHECKOUT", "Guest Checked Out",
                    "Booking #" + bookingId.toString().substring(0, 8).toUpperCase()
                    + " — room " + room.getRoomNumber() + " is now free.",
                    "ADMIN");
        } catch (Exception e) {
            log.warn("Notification failed after check-out for booking {}: {}", bookingId, e.getMessage(), e);
        }

        return bookingMapper.toDto(booking);
    }
}

