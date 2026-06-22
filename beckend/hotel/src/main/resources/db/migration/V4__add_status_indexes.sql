-- Status-column indexes for COUNT/filter queries on operational tables.
-- All tables below are hit on every dashboard refresh by countByStatus / countByStatusIn queries.

-- room.room_status  (ChainController /summary, AiInsightController room counts)
CREATE INDEX IF NOT EXISTS idx_room_room_status
    ON room (room_status);

-- housekeeping_tasks.status  (AiInsightController, AiController countByStatusIn)
CREATE INDEX IF NOT EXISTS idx_housekeeping_status
    ON housekeeping_tasks (status);

-- maintenance_requests.status  (AiInsightController, AiController countByStatus/In)
CREATE INDEX IF NOT EXISTS idx_maintenance_status
    ON maintenance_requests (status);

-- service_request.status  (AiInsightController, AiController countByStatusIn)
CREATE INDEX IF NOT EXISTS idx_service_request_status
    ON service_request (status);

-- payments.status  (future payment status queries; payment state machine)
CREATE INDEX IF NOT EXISTS idx_payments_status
    ON payments (status);

-- bookings.total_amount — partial index for AVG/SUM queries.
-- NULLs excluded because avgTotalAmountExcluding / sumTotalAmountExcluding always
-- filter WHERE total_amount IS NOT NULL AND booking_status <> 'CANCELLED'.
CREATE INDEX IF NOT EXISTS idx_bookings_total_amount_active
    ON bookings (total_amount)
    WHERE total_amount IS NOT NULL AND booking_status <> 'CANCELLED';

-- bookings.check_in_date — partial index for today's arrivals and reminder scheduler.
-- Covers findByCheckInDateAndBookingStatusNot / findByCheckInDateAndBookingStatusIn.
CREATE INDEX IF NOT EXISTS idx_bookings_checkin_active
    ON bookings (check_in_date)
    WHERE booking_status <> 'CANCELLED';

-- bookings.check_out_date — partial index for today's departures.
-- Covers findByCheckOutDateAndBookingStatusNot.
CREATE INDEX IF NOT EXISTS idx_bookings_checkout_active
    ON bookings (check_out_date)
    WHERE booking_status <> 'CANCELLED';
