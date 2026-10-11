-- Payments ledger: several payments per booking, partial payments, voucher info.

-- A booking can be paid in several parts (deposit + balance, split bills).
-- The old one-to-one unique constraint made the second payment fail.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS uk_nuscjm6x127hkb15kcb8n56wo;

-- Stripe PaymentIntent ID or receipt number, for reconciliation.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_reference varchar(255);

-- Booking level status for "some money received, but not the full total".
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
    CHECK (payment_status IN ('PENDING','PAID','CANCELLED','UNPAID','FAILED',
                              'REFUNDED','REFUND_REQUIRED','PARTIALLY_PAID'));
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('PENDING','PAID','CANCELLED','UNPAID','FAILED',
                      'REFUNDED','REFUND_REQUIRED','PARTIALLY_PAID'));

-- Voucher applied at booking time; the discount is already deducted from total_amount.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voucher_code varchar(64);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2);

-- One Stripe PaymentIntent can pay for exactly one booking.
CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_stripe_payment_intent
    ON bookings (stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;

-- Lookup of the open website holds by the expiry job.
CREATE INDEX IF NOT EXISTS idx_bookings_online_holds
    ON bookings (created_at)
    WHERE booking_status = 'PENDING' AND stripe_payment_intent_id IS NOT NULL;
