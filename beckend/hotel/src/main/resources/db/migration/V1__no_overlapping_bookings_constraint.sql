-- DB-level guard against double-bookings using PostgreSQL exclusion constraint.
-- Requires the btree_gist extension (available on all standard PostgreSQL installations).
-- Half-open interval [check_in_date, check_out_date) matches the application logic.
-- Cancelled bookings are excluded from the constraint.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
    ADD CONSTRAINT no_overlapping_bookings
        EXCLUDE USING gist (
            room_id WITH =,
            daterange(check_in_date, check_out_date, '[)') WITH &&
        )
        WHERE (booking_status <> 'CANCELLED');
