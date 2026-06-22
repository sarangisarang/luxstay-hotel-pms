-- Extend payments.status to include REFUND_REQUIRED
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
    CHECK (status IN ('PENDING','PAID','CANCELLED','UNPAID','FAILED','REFUNDED','REFUND_REQUIRED'));

-- Extend invoices.status to include CREDIT_NOTE_REQUIRED
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('GENERATED','SENT','UNPAID','CANCELLED','PAID','CREDIT_NOTE_REQUIRED'));
