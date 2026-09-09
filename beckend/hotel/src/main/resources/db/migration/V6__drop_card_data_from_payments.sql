-- Stop storing cardholder data.
--
-- The payments table held card_number, expiry and cvv as plain columns, and the
-- payment response DTO returned all three. Storing a CVV after authorisation is
-- prohibited outright, and a stored PAN is a liability the system has no reason
-- to carry: real charges go through Stripe, which keeps the card on its side.
--
-- Only the last four digits are kept, which is what a receipt or a reconciliation
-- actually needs. The backfill takes them from the existing column before it is
-- dropped, so historical rows stay identifiable.
--
-- This removes the card columns on purpose and cannot be undone. That is the point.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_last4 varchar(4);

UPDATE payments
   SET card_last4 = right(regexp_replace(card_number, '\D', '', 'g'), 4)
 WHERE card_number IS NOT NULL
   AND length(regexp_replace(card_number, '\D', '', 'g')) >= 4;

ALTER TABLE payments DROP COLUMN IF EXISTS card_number;
ALTER TABLE payments DROP COLUMN IF EXISTS expiry;
ALTER TABLE payments DROP COLUMN IF EXISTS cvv;
