#!/usr/bin/env bash
# reset-demo-data.sh
# Wipes and re-seeds all Demo Grand Hotel data so the live demo always
# looks clean. Safe to run at any time — only touches demo hotel / rooms
# 901-925 / guests with @email.com addresses / demo user accounts.
#
# Usage:  ./scripts/reset-demo-data.sh
# Requires: psql, PGPASSWORD env or .pgpass

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-booking}"
DB_USER="${DB_USER:-booking_user}"

# ─── Safety guard ─────────────────────────────────────────────────────────────
# This script deletes and re-seeds real database rows.
# Require an explicit opt-in to prevent accidental runs on production.
if [[ "${ALLOW_DEMO_RESET:-}" != "true" ]]; then
    echo "ERROR: ALLOW_DEMO_RESET is not set to 'true'. Refusing to run." >&2
    echo "       Set ALLOW_DEMO_RESET=true to confirm you know what this script does." >&2
    exit 1
fi

# Double-check: refuse if DB_NAME looks like a production database name.
if [[ "$DB_NAME" != *demo* && "$DB_NAME" != *dev* && "$DB_NAME" != *test* && "$DB_NAME" != "booking" ]]; then
    echo "ERROR: DB_NAME='$DB_NAME' does not match an expected demo/dev/test database." >&2
    echo "       This script must not run against production data." >&2
    exit 1
fi
# ──────────────────────────────────────────────────────────────────────────────
PGPASSWORD="${PGPASSWORD:-1234}"

export PGPASSWORD

PSQ="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1"

echo "=== Demo Data Reset — $(date '+%Y-%m-%d %H:%M:%S') ==="

$PSQ << 'ENDSQL'

-- ─── 1. Wipe all derived demo data ───────────────────────────────────────────

DELETE FROM feedback_review       WHERE hotel_id = 'b17bedc8-47e7-46ed-9822-802433a2f746';
DELETE FROM concierge_requests    WHERE room_number BETWEEN 901 AND 925;
DELETE FROM housekeeping_tasks    WHERE room_number BETWEEN 901 AND 925;
DELETE FROM maintenance_requests  WHERE room_number BETWEEN 901 AND 925;
DELETE FROM invoices i            WHERE i.booking_id IN (
    SELECT b.id FROM bookings b JOIN room r ON b.room_id = r.id WHERE r.room_number BETWEEN 901 AND 925);
DELETE FROM payments p            WHERE p.booking_id IN (
    SELECT b.id FROM bookings b JOIN room r ON b.room_id = r.id WHERE r.room_number BETWEEN 901 AND 925);
DELETE FROM booking_services bs   WHERE bs.booking_id IN (
    SELECT b.id FROM bookings b JOIN room r ON b.room_id = r.id WHERE r.room_number BETWEEN 901 AND 925);
DELETE FROM bookings b            WHERE b.id IN (
    SELECT b2.id FROM bookings b2 JOIN room r ON b2.room_id = r.id WHERE r.room_number BETWEEN 901 AND 925);
DELETE FROM guest_loyalty gl      WHERE gl.guest_id IN (
    SELECT id FROM guest WHERE email LIKE '%@email.com%');

-- ─── 2. Re-seed bookings ─────────────────────────────────────────────────────

INSERT INTO bookings (id, room_id, guest_id, guest_name, check_in_date, check_out_date, booking_status, payment_status, total_amount, total_service_amount, room_number, created_at, booking_source)
VALUES
-- CHECKED_IN
(gen_random_uuid(), 'db802a25-a7d0-4654-984f-b7e8ee511bb0', '5e72d837-ea33-42d1-bb3a-4619bfe1899a', 'James Morrison',   CURRENT_DATE - 2,  CURRENT_DATE + 3,  'CHECKED_IN', 'PAID',    '445.00', '0.00',   901, now(), 'DIRECT_WEBSITE'),
(gen_random_uuid(), '8b4848f0-0f1d-44fa-bf0b-3b4bf7bd36ae', '25624abf-c4fe-45a0-a95d-226e77285c74', 'Sophie Laurent',   CURRENT_DATE - 1,  CURRENT_DATE + 2,  'CHECKED_IN', 'PAID',    '267.00', '50.00',  902, now(), 'OTA_BOOKING_COM'),
(gen_random_uuid(), 'd7e7b134-1c21-4d53-b10d-e50e1e8f7949', 'd6eb10a8-30f4-4d82-a3bc-f70af43b1e2f', 'Marco Rossi',     CURRENT_DATE - 3,  CURRENT_DATE + 1,  'CHECKED_IN', 'PAID',    '356.00', '80.00',  903, now(), 'DIRECT_WEBSITE'),
(gen_random_uuid(), '8bffb0c4-5c8e-4d71-81cf-007039592e10', '0456d089-6846-492f-a3ef-ed4c6014096a', 'Yuki Tanaka',     CURRENT_DATE - 4,  CURRENT_DATE + 4,  'CHECKED_IN', 'PAID',   '1192.00','120.00', 909, now(), 'OTA_EXPEDIA'),
(gen_random_uuid(), 'd0812a33-4431-42de-8b99-04253255fefd', 'ff08c994-1784-479d-a4e0-3083022b7c7b', 'Anna Schmidt',    CURRENT_DATE,      CURRENT_DATE + 3,  'CHECKED_IN', 'PAID',    '447.00', '0.00',   910, now(), 'DIRECT_PHONE'),
(gen_random_uuid(), '3c7be333-4fee-4b33-b2e5-5d6005694331', 'a6c7dd4d-d21f-428a-80fa-8562e81d029b', 'Ahmed AlRashid',  CURRENT_DATE - 2,  CURRENT_DATE + 5,  'CHECKED_IN', 'PAID',   '1603.00','200.00', 917, now(), 'CORPORATE'),
(gen_random_uuid(), 'b7458539-eca2-487a-ae3e-f754f1e32ce0', '8be43e43-8367-4f42-8fa3-78f9f3f7aae4', 'Isabella Ferrari',CURRENT_DATE - 1,  CURRENT_DATE + 3,  'CHECKED_IN', 'PAID',   '1396.00','150.00', 923, now(), 'TRAVEL_AGENT'),
-- CONFIRMED
(gen_random_uuid(), '358bff9b-ce38-450c-9e1b-4588619e2849', '72279b49-edbe-4725-bb80-43a13a6d2dcf', 'Carlos Garcia',   CURRENT_DATE + 1,  CURRENT_DATE + 6,  'CONFIRMED',  'UNPAID',  '445.00', '0.00',   904, now(), 'DIRECT_WEBSITE'),
(gen_random_uuid(), '874a581e-6798-495f-86b2-451c9c3f829e', '505497f3-6823-4218-9bca-a3090e82dfe8', 'Emma Wilson',     CURRENT_DATE + 2,  CURRENT_DATE + 9,  'CONFIRMED',  'UNPAID',  '623.00', '0.00',   905, now(), 'OTA_BOOKING_COM'),
(gen_random_uuid(), '0a06b9c1-c2e5-441a-92ad-7f942213281c', '2cbffb1c-e559-4ee3-9075-bba465201b83', 'Liam OBrien',     CURRENT_DATE + 5,  CURRENT_DATE + 8,  'CONFIRMED',  'UNPAID',  '447.00', '0.00',   911, now(), 'DIRECT_WEBSITE'),
(gen_random_uuid(), 'da95c6d7-cf2b-4644-92a1-0bfce6cbeb98', '81f89aa9-9874-4cae-8ec4-354b5d1cb9ff', 'Lucas Dubois',    CURRENT_DATE + 7,  CURRENT_DATE + 11, 'CONFIRMED',  'UNPAID',  '596.00', '0.00',   912, now(), 'OTA_EXPEDIA'),
(gen_random_uuid(), '316f1d00-314d-4660-940b-eff09cecb3d3', '8741c03b-abbb-421e-9068-21beb5730004', 'Amelia Taylor',   CURRENT_DATE + 9,  CURRENT_DATE + 14, 'CONFIRMED',  'UNPAID', '1145.00', '0.00',   918, now(), 'LOYALTY_PROGRAM'),
(gen_random_uuid(), 'd96fe61b-e6cf-4483-9fd6-bcdc9bf6b299', 'e1aff7c7-5a38-4575-b39c-c44afb9c53bf', 'Ravi Patel',      CURRENT_DATE + 14, CURRENT_DATE + 19, 'CONFIRMED',  'UNPAID', '1745.00', '0.00',   924, now(), 'DIRECT_WEBSITE'),
-- PENDING
(gen_random_uuid(), 'ed1d002a-ad63-4d55-b957-99141d02075f', 'd5ad8be4-3832-4146-94a1-a6d7856d08e4', 'Oliver Brown',    CURRENT_DATE + 12, CURRENT_DATE + 15, 'PENDING',    'UNPAID',  '267.00', '0.00',   906, now(), 'DIRECT_WEBSITE'),
(gen_random_uuid(), '5f960528-ba11-44b3-9733-d43f74289627', 'be267bab-ef41-4c77-87cd-7bd64283c22d', 'Nina Petrov',     CURRENT_DATE + 16, CURRENT_DATE + 19, 'PENDING',    'UNPAID',  '447.00', '0.00',   913, now(), 'OTA_OTHER'),
(gen_random_uuid(), '75724fbf-d216-43cd-9c00-656fbbe38aaa', '411e8a93-75ed-4f42-a41a-7031a4c6be5d', 'Tom Hansen',      CURRENT_DATE + 19, CURRENT_DATE + 24, 'PENDING',    'UNPAID', '1745.00', '0.00',   925, now(), 'TRAVEL_AGENT'),
-- COMPLETED
(gen_random_uuid(), 'c49e2010-e746-42ed-a83e-e5ec2980ab1b', 'b56c884a-ed56-4caf-8ede-c869a6b9bd87', 'Chloe Martin',    CURRENT_DATE - 17, CURRENT_DATE - 13, 'COMPLETED',  'PAID',    '356.00', '60.00',  907, now(), 'DIRECT_WEBSITE'),
(gen_random_uuid(), 'a8793e3e-cb46-4536-a329-cbe3b34289b5', '80c2f66b-eeae-454d-9a94-0a96142b1f1a', 'Fatima Hassan',   CURRENT_DATE - 22, CURRENT_DATE - 18, 'COMPLETED',  'PAID',    '356.00', '0.00',   908, now(), 'OTA_BOOKING_COM'),
(gen_random_uuid(), '5f524888-b183-48da-b784-d28fd91d0dae', '0a993b98-e3b8-4fac-a16d-cc8f935f90ed', 'Hugo Muller',     CURRENT_DATE - 15, CURRENT_DATE - 10, 'COMPLETED',  'PAID',    '745.00', '90.00',  914, now(), 'CORPORATE'),
(gen_random_uuid(), '7b807f72-232f-499a-bfa9-d1dd8eb80ebb', '9826d9b4-41e2-415d-8078-d3ff706b3dfa', 'Park Jinhee',     CURRENT_DATE - 19, CURRENT_DATE - 15, 'COMPLETED',  'PAID',    '596.00', '0.00',   915, now(), 'OTA_EXPEDIA'),
(gen_random_uuid(), '78bd1c45-da81-4233-9450-fced24a5900d', 'de9b3916-4109-4aa8-ad12-273c330010d1', 'Kenji Yamamoto',  CURRENT_DATE - 12, CURRENT_DATE - 7,  'COMPLETED',  'PAID',    '745.00','150.00', 916, now(), 'DIRECT_WEBSITE'),
(gen_random_uuid(), 'f70a2fb8-9957-4ece-a683-1977949ae3c6', '7b5bb67e-c36a-421f-8685-3f79dd0178d5', 'Maria Pereira',   CURRENT_DATE - 26, CURRENT_DATE - 21, 'COMPLETED',  'PAID',   '1145.00', '0.00',   919, now(), 'LOYALTY_PROGRAM'),
(gen_random_uuid(), '7aa5f64f-3809-4bbc-8adc-1333c60bf9be', '4efe8c8d-0972-40c8-adce-b427c9f0000d', 'Mei Zhang',       CURRENT_DATE - 9,  CURRENT_DATE - 4,  'COMPLETED',  'PAID',   '1145.00','200.00', 920, now(), 'OTA_BOOKING_COM'),
(gen_random_uuid(), '116f619e-615e-41cb-84ca-79809843ee90', 'fdfd2c37-30f4-49e7-ab28-0e42b56aa115', 'Valentina Cruz',  CURRENT_DATE - 7,  CURRENT_DATE - 2,  'COMPLETED',  'PAID',   '1145.00','100.00', 921, now(), 'DIRECT_WEBSITE'),
-- CANCELLED
(gen_random_uuid(), 'ecc388e5-8ce8-4d2f-9bae-79b997bc13a9', '78cfec18-708e-4375-94e0-9ce37d915920', 'Sofia Andersson', CURRENT_DATE - 5,  CURRENT_DATE - 2,  'CANCELLED',  'CANCELLED','687.00','0.00', 922, now(), 'OTA_BOOKING_COM');

-- ─── 3. Payments for PAID bookings ───────────────────────────────────────────

INSERT INTO payments (id, booking_id, guest_id, guest_name, guest_email, amount, payment_method, status, payment_date, card_number, expiry, cvv)
SELECT
    gen_random_uuid(), b.id, b.guest_id, b.guest_name, g.email,
    b.total_amount,
    CASE (ROW_NUMBER() OVER ()) % 3 WHEN 0 THEN 'CREDIT_CARD' WHEN 1 THEN 'DEBIT_CARD' ELSE 'BANK_TRANSFER' END,
    'PAID',
    b.check_in_date::timestamp,
    CASE (ROW_NUMBER() OVER ()) % 3 WHEN 0 THEN '**** **** **** 4242' WHEN 1 THEN '**** **** **** 1234' ELSE '**** **** **** 9876' END,
    CASE (ROW_NUMBER() OVER ()) % 3 WHEN 0 THEN '12/28' WHEN 1 THEN '08/27' ELSE '03/29' END,
    '***'
FROM bookings b
JOIN guest g ON b.guest_id = g.id
JOIN room  r ON b.room_id  = r.id
WHERE r.room_number BETWEEN 901 AND 925
  AND b.payment_status = 'PAID'
ON CONFLICT (booking_id) DO NOTHING;

-- ─── 4. Invoices ─────────────────────────────────────────────────────────────

INSERT INTO invoices (id, booking_id, invoice_number, issued_date, amount, status)
SELECT
    gen_random_uuid(), b.id,
    'DEMO-INV-' || LPAD(ROW_NUMBER() OVER (ORDER BY b.check_in_date)::text, 4, '0'),
    b.check_in_date::timestamp,
    b.total_amount,
    CASE b.booking_status
        WHEN 'COMPLETED'  THEN 'PAID'
        WHEN 'CHECKED_IN' THEN 'SENT'
        WHEN 'CONFIRMED'  THEN 'GENERATED'
        WHEN 'PENDING'    THEN 'GENERATED'
        WHEN 'CANCELLED'  THEN 'CANCELLED'
        ELSE 'GENERATED'
    END
FROM bookings b JOIN room r ON b.room_id = r.id
WHERE r.room_number BETWEEN 901 AND 925
ON CONFLICT (booking_id) DO NOTHING;

-- ─── 5. Housekeeping tasks ────────────────────────────────────────────────────

INSERT INTO housekeeping_tasks (id, room_id, room_number, type, status, priority, assigned_to, scheduled_at, created_at, notes)
VALUES
(gen_random_uuid(),'db802a25-a7d0-4654-984f-b7e8ee511bb0',901,'DAILY_CLEAN',   'DONE',       'MEDIUM','Maria K.',  now() - interval '6 hours', now(), 'Guest requested extra towels'),
(gen_random_uuid(),'8b4848f0-0f1d-44fa-bf0b-3b4bf7bd36ae',902,'DAILY_CLEAN',   'IN_PROGRESS','MEDIUM','Ana L.',    now() - interval '2 hours', now(), NULL),
(gen_random_uuid(),'d7e7b134-1c21-4d53-b10d-e50e1e8f7949',903,'DAILY_CLEAN',   'PENDING',    'MEDIUM','Maria K.',  now() + interval '1 hour',  now(), 'DND until noon'),
(gen_random_uuid(),'8bffb0c4-5c8e-4d71-81cf-007039592e10',909,'TURNDOWN',      'PENDING',    'LOW',   'Ana L.',    now() + interval '8 hours', now(), NULL),
(gen_random_uuid(),'d0812a33-4431-42de-8b99-04253255fefd',910,'DAILY_CLEAN',   'DONE',       'MEDIUM','Giorgi M.', now() - interval '4 hours', now(), NULL),
(gen_random_uuid(),'3c7be333-4fee-4b33-b2e5-5d6005694331',917,'DAILY_CLEAN',   'DONE',       'HIGH',  'Giorgi M.', now() - interval '5 hours', now(), 'Suite — white glove'),
(gen_random_uuid(),'b7458539-eca2-487a-ae3e-f754f1e32ce0',923,'TURNDOWN',      'PENDING',    'HIGH',  'Maria K.',  now() + interval '7 hours', now(), 'Champagne setup'),
(gen_random_uuid(),'c49e2010-e746-42ed-a83e-e5ec2980ab1b',907,'CHECKOUT_CLEAN','DONE',       'HIGH',  'Ana L.',    now() - interval '13 days', now(), NULL),
(gen_random_uuid(),'a8793e3e-cb46-4536-a329-cbe3b34289b5',908,'INSPECTION',    'DONE',       'MEDIUM','Giorgi M.', now() - interval '18 days', now(), 'Passed inspection');

-- ─── 6. Concierge requests ────────────────────────────────────────────────────

DO $$
DECLARE
    b_james UUID; b_sophie UUID; b_marco UUID; b_yuki UUID;
    b_anna UUID;  b_ahmed UUID;  b_isabella UUID;
BEGIN
    SELECT id INTO b_james    FROM bookings WHERE guest_id='5e72d837-ea33-42d1-bb3a-4619bfe1899a' AND booking_status='CHECKED_IN' LIMIT 1;
    SELECT id INTO b_sophie   FROM bookings WHERE guest_id='25624abf-c4fe-45a0-a95d-226e77285c74' AND booking_status='CHECKED_IN' LIMIT 1;
    SELECT id INTO b_marco    FROM bookings WHERE guest_id='d6eb10a8-30f4-4d82-a3bc-f70af43b1e2f' AND booking_status='CHECKED_IN' LIMIT 1;
    SELECT id INTO b_yuki     FROM bookings WHERE guest_id='0456d089-6846-492f-a3ef-ed4c6014096a' AND booking_status='CHECKED_IN' LIMIT 1;
    SELECT id INTO b_anna     FROM bookings WHERE guest_id='ff08c994-1784-479d-a4e0-3083022b7c7b' AND booking_status='CHECKED_IN' LIMIT 1;
    SELECT id INTO b_ahmed    FROM bookings WHERE guest_id='a6c7dd4d-d21f-428a-80fa-8562e81d029b' AND booking_status='CHECKED_IN' LIMIT 1;
    SELECT id INTO b_isabella FROM bookings WHERE guest_id='8be43e43-8367-4f42-8fa3-78f9f3f7aae4' AND booking_status='CHECKED_IN' LIMIT 1;

    INSERT INTO concierge_requests (id,booking_id,guest_id,guest_name,room_number,type,description,status,assigned_to,created_at,requested_for) VALUES
    (gen_random_uuid(),b_james,   '5e72d837-ea33-42d1-bb3a-4619bfe1899a','James Morrison',  901,'TAXI_TRANSFER',        'Airport transfer — 3 pax, flight 18:30',             'PENDING',    'Reception',   now()-interval'2 hours', now()+interval'6 hours'),
    (gen_random_uuid(),b_sophie,  '25624abf-c4fe-45a0-a95d-226e77285c74','Sophie Laurent',  902,'SPA_APPOINTMENT',      'Full body massage 90 min, female therapist',          'IN_PROGRESS','Spa Team',    now()-interval'1 hour',  now()+interval'2 hours'),
    (gen_random_uuid(),b_marco,   'd6eb10a8-30f4-4d82-a3bc-f70af43b1e2f','Marco Rossi',     903,'RESTAURANT_RESERVATION','Table for 2 at Café Betsy 20:00, anniversary',       'COMPLETED',  'Ana L.',      now()-interval'5 hours', now()-interval'1 hour'),
    (gen_random_uuid(),b_yuki,    '0456d089-6846-492f-a3ef-ed4c6014096a','Yuki Tanaka',     909,'ROOM_SERVICE',         'Green tea, jasmine tea, water, cheese board',          'COMPLETED',  'Room Service',now()-interval'3 hours', now()-interval'2 hours'),
    (gen_random_uuid(),b_anna,    'ff08c994-1784-479d-a4e0-3083022b7c7b','Anna Schmidt',    910,'WAKE_UP_CALL',         'Wake-up call 06:30 tomorrow + breakfast in room',      'PENDING',    'Reception',   now()-interval'30 min',  now()+interval'20 hours'),
    (gen_random_uuid(),b_ahmed,   'a6c7dd4d-d21f-428a-80fa-8562e81d029b','Ahmed AlRashid',  917,'BUSINESS_SERVICES',    'Meeting room 8 pax, projector, +2 days from today',    'IN_PROGRESS','Giorgi M.',   now()-interval'4 hours', now()+interval'2 days'),
    (gen_random_uuid(),b_isabella,'8be43e43-8367-4f42-8fa3-78f9f3f7aae4','Isabella Ferrari',923,'FLOWER_ARRANGEMENT',   'Red roses & champagne, budget €120',                  'COMPLETED',  'Concierge',   now()-interval'6 hours', now()-interval'5 hours'),
    (gen_random_uuid(),b_james,   '5e72d837-ea33-42d1-bb3a-4619bfe1899a','James Morrison',  901,'LAUNDRY',              '2 shirts, 1 suit jacket — same day',                  'IN_PROGRESS','Laundry',     now()-interval'2 hours', now()+interval'4 hours'),
    (gen_random_uuid(),b_yuki,    '0456d089-6846-492f-a3ef-ed4c6014096a','Yuki Tanaka',     909,'TOUR_EXCURSION',       'Private old Tbilisi tour, 3h, EN+JP guide',           'PENDING',    NULL,          now()-interval'1 hour',  now()+interval'1 day'),
    (gen_random_uuid(),b_ahmed,   'a6c7dd4d-d21f-428a-80fa-8562e81d029b','Ahmed AlRashid',  917,'CAR_RENTAL',           'Mercedes E-Class, driver preferred, 3 days',           'PENDING',    NULL,          now()-interval'1 hour',  now()+interval'2 days');
END;
$$;

-- ─── 7. Maintenance requests ──────────────────────────────────────────────────

INSERT INTO maintenance_requests (id,room_id,room_number,title,category,description,priority,status,reported_by,reported_at,created_at) VALUES
(gen_random_uuid(),'db802a25-a7d0-4654-984f-b7e8ee511bb0',901,'Bedside lamp flickering',       'ELECTRICAL','Flickering intermittently — bulb replaced, may be wiring.','MEDIUM','OPEN',       'James Morrison (Guest)',now()-interval'3 hours',now()-interval'3 hours'),
(gen_random_uuid(),'d0812a33-4431-42de-8b99-04253255fefd',910,'Slow drain — bathroom sink',    'PLUMBING',  'Minor blockage in bathroom sink.',                         'LOW',   'IN_PROGRESS','Housekeeping (Maria K.)',now()-interval'5 hours',now()-interval'5 hours'),
(gen_random_uuid(),'3c7be333-4fee-4b33-b2e5-5d6005694331',917,'AC not cooling properly',       'HVAC',      'Cannot reach set temperature. Guest reports too warm.',    'HIGH',  'OPEN',       'Reception',             now()-interval'1 hour', now()-interval'1 hour'),
(gen_random_uuid(),'c49e2010-e746-42ed-a83e-e5ec2980ab1b',907,'Broken drawer handle',          'FURNITURE', 'Bedside table drawer handle broken.',                      'LOW',   'RESOLVED',   'Housekeeping (Ana L.)', now()-interval'14 days',now()-interval'14 days'),
(gen_random_uuid(),'ecc388e5-8ce8-4d2f-9bae-79b997bc13a9',922,'Carpet stain — deep clean',    'CLEANING',  'Stain on carpet — deep clean before next guest.',          'MEDIUM','RESOLVED',   'Housekeeping (Giorgi M.)',now()-interval'5 days',now()-interval'5 days');

-- ─── 8. Reviews ──────────────────────────────────────────────────────────────

INSERT INTO feedback_review (id,guest_id,hotel_id,rating,feedback_text,comment,created_at) VALUES
(gen_random_uuid(),'b56c884a-ed56-4caf-8ede-c869a6b9bd87','b17bedc8-47e7-46ed-9822-802433a2f746',9, 'Exceptional stay — staff went above and beyond.',                                       'Will definitely return.',                    now()-interval'13 days'),
(gen_random_uuid(),'80c2f66b-eeae-454d-9a94-0a96142b1f1a','b17bedc8-47e7-46ed-9822-802433a2f746',8, 'Lovely hotel, great breakfast, minor AC issue resolved same day.',                      'Wonderful experience overall.',              now()-interval'18 days'),
(gen_random_uuid(),'0a993b98-e3b8-4fac-a16d-cc8f935f90ed','b17bedc8-47e7-46ed-9822-802433a2f746',10,'Perfect from start to finish. Suite was stunning, concierge service world-class.',       'Best hotel stay of the year!',               now()-interval'10 days'),
(gen_random_uuid(),'9826d9b4-41e2-415d-8078-d3ff706b3dfa','b17bedc8-47e7-46ed-9822-802433a2f746',8, 'Great property, professional team. Spa facilities top notch.',                           NULL,                                         now()-interval'15 days'),
(gen_random_uuid(),'de9b3916-4109-4aa8-ad12-273c330010d1','b17bedc8-47e7-46ed-9822-802433a2f746',9, 'Business center and meeting facilities excellent. Room service fast.',                   'Highly recommended for corporate stays.',    now()-interval'7 days'),
(gen_random_uuid(),'7b5bb67e-c36a-421f-8685-3f79dd0178d5','b17bedc8-47e7-46ed-9822-802433a2f746',7, 'Good hotel, a bit pricey but quality is there. Pool busy on weekends.',                  'Would return for a special occasion.',       now()-interval'22 days'),
(gen_random_uuid(),'4efe8c8d-0972-40c8-adce-b427c9f0000d','b17bedc8-47e7-46ed-9822-802433a2f746',9, 'Personalized welcome note and local chocolates — lovely touch!',                        'AI concierge was surprisingly helpful.',     now()-interval'4 days'),
(gen_random_uuid(),'fdfd2c37-30f4-49e7-ab28-0e42b56aa115','b17bedc8-47e7-46ed-9822-802433a2f746',8, 'Smooth check-in, stunning junior suite, breathtaking sunset view.',                     NULL,                                         now()-interval'2 days');

-- ─── 9. Loyalty profiles ─────────────────────────────────────────────────────

INSERT INTO guest_loyalty (id,guest_id,guest_name,guest_email,points,tier,total_spent,total_stays,updated_at) VALUES
(gen_random_uuid(),'b56c884a-ed56-4caf-8ede-c869a6b9bd87','Chloe Martin',    'chloe.martin@email.com',    35,   'BRONZE',  356.00,    1, now()),
(gen_random_uuid(),'80c2f66b-eeae-454d-9a94-0a96142b1f1a','Fatima Hassan',   'fatima.hassan@email.com',   35,   'BRONZE',  356.00,    1, now()),
(gen_random_uuid(),'0a993b98-e3b8-4fac-a16d-cc8f935f90ed','Hugo Muller',     'hugo.muller@email.com',     74,   'BRONZE',  745.00,    1, now()),
(gen_random_uuid(),'9826d9b4-41e2-415d-8078-d3ff706b3dfa','Park Jinhee',     'park.jinhee@email.com',     59,   'BRONZE',  596.00,    1, now()),
(gen_random_uuid(),'de9b3916-4109-4aa8-ad12-273c330010d1','Kenji Yamamoto',  'kenji.yamamoto@email.com',  74,   'BRONZE',  745.00,    1, now()),
(gen_random_uuid(),'7b5bb67e-c36a-421f-8685-3f79dd0178d5','Maria Pereira',   'maria.pereira@email.com',   114,  'BRONZE', 1145.00,    1, now()),
(gen_random_uuid(),'4efe8c8d-0972-40c8-adce-b427c9f0000d','Mei Zhang',       'mei.zhang@email.com',       114,  'BRONZE', 1145.00,    1, now()),
(gen_random_uuid(),'fdfd2c37-30f4-49e7-ab28-0e42b56aa115','Valentina Cruz',  'valentina.cruz@email.com',  114,  'BRONZE', 1145.00,    1, now()),
(gen_random_uuid(),'5e72d837-ea33-42d1-bb3a-4619bfe1899a','James Morrison',  'james.morrison@email.com',  512,  'SILVER', 2180.00,    5, now()),
(gen_random_uuid(),'a6c7dd4d-d21f-428a-80fa-8562e81d029b','Ahmed AlRashid',  'ahmed.alrashid@email.com',  2450, 'GOLD',   8900.00,   12, now()),
(gen_random_uuid(),'8be43e43-8367-4f42-8fa3-78f9f3f7aae4','Isabella Ferrari','isabella.ferrari@email.com',5240,'PLATINUM',18500.00,  28, now())
ON CONFLICT (guest_id) DO UPDATE SET
    points      = EXCLUDED.points,
    tier        = EXCLUDED.tier,
    total_spent = EXCLUDED.total_spent,
    total_stays = EXCLUDED.total_stays,
    updated_at  = EXCLUDED.updated_at;

SELECT 'Reset complete — ' || COUNT(*) || ' demo bookings' AS result
FROM bookings b JOIN room r ON b.room_id = r.id WHERE r.room_number BETWEEN 901 AND 925;

ENDSQL

echo "=== Done ==="
