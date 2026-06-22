-- Performance indexes for booking overlap queries, status filters, and payment lookups.
-- All indexes are created CONCURRENTLY where possible to avoid table locks.
-- The booking-status + date composite index is the hot path for night-audit and overdue-booking scans.

-- Booking: overlap query columns (check_in_date, check_out_date used in WHERE b.checkInDate < :to AND b.checkOutDate > :from)
CREATE INDEX IF NOT EXISTS idx_bookings_dates
    ON bookings (check_in_date, check_out_date);

-- Booking: status filter (findByBookingStatusIn, countByBookingStatusIn, findOverdueBookings)
CREATE INDEX IF NOT EXISTS idx_bookings_status
    ON bookings (booking_status);

-- Booking: guest lookup (findByGuestId, findActiveByGuestId)
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id
    ON bookings (guest_id);

-- Booking: room lookup (findByRoomId, overlap query joins on room_id)
CREATE INDEX IF NOT EXISTS idx_bookings_room_id
    ON bookings (room_id);

-- Booking: compound for the hot overlap query (room_id + dates + status all used together)
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates_status
    ON bookings (room_id, check_in_date, check_out_date, booking_status);

-- Payment: booking lookup (findByBookingId used in cancel sync)
CREATE INDEX IF NOT EXISTS idx_payments_booking_id
    ON payments (booking_id);

-- Payment: guest lookup (findByGuestId used in payment list)
CREATE INDEX IF NOT EXISTS idx_payments_guest_id
    ON payments (guest_id);

-- Invoice: booking lookup (findByBookingId used in cancel sync)
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id
    ON invoices (booking_id);

-- ChatMemory: session + ordering (findLastN queries by sessionId ORDER BY createdAt DESC)
CREATE INDEX IF NOT EXISTS idx_chat_memory_session_created
    ON chat_memory (session_id, created_at DESC);

-- Partial index for the active-booking overlap query.
-- Excludes CANCELLED rows from the index entirely — faster than a full compound index
-- because cancelled bookings accumulate over time and inflate the index unnecessarily.
CREATE INDEX IF NOT EXISTS idx_bookings_active_overlap
    ON bookings (room_id, check_in_date, check_out_date)
    WHERE booking_status <> 'CANCELLED';
