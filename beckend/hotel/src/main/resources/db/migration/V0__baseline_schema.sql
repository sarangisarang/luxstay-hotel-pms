-- V0 - Baseline schema (pre-Flyway base tables).
-- Generated from the JPA/Hibernate entity model: the schema migrations V1+ build on.
-- Clean DB: Flyway runs V0 then V1-V5. Existing pre-Flyway DB: baseline-version=0
-- marks V0 as applied so it is skipped. Do NOT edit retroactively.


CREATE TABLE public.ai_call_log (
    id uuid NOT NULL,
    ai_response text,
    confidence_level character varying(255),
    created_at timestamp(6) without time zone,
    endpoint character varying(255),
    handoff_triggered boolean NOT NULL,
    latency_ms bigint NOT NULL,
    rag_hits integer NOT NULL,
    retry_count integer NOT NULL,
    session_id character varying(255),
    used_claude boolean NOT NULL,
    used_rag boolean NOT NULL,
    user_message text
);

CREATE TABLE public.ai_messages (
    id uuid NOT NULL,
    content character varying(8000) NOT NULL,
    created_at timestamp(6) without time zone,
    role character varying(255) NOT NULL,
    session_id uuid NOT NULL,
    user_email character varying(255)
);

CREATE TABLE public.app_notifications (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    message text NOT NULL,
    read boolean NOT NULL,
    recipient_role character varying(255),
    title character varying(255) NOT NULL,
    type character varying(255) NOT NULL
);

CREATE TABLE public.booking_services (
    booking_id uuid NOT NULL,
    service_id uuid NOT NULL
);

CREATE TABLE public.bookings (
    id uuid NOT NULL,
    booking_source character varying(255),
    booking_status character varying(255),
    check_in_date date,
    check_out_date date,
    created_at timestamp(6) without time zone,
    guest_name character varying(255),
    payment_status character varying(255),
    room_number integer,
    special_requests text,
    stripe_payment_intent_id character varying(255),
    total_amount numeric(38,2),
    total_service_amount numeric(38,2),
    guest_id uuid,
    room_id uuid,
    CONSTRAINT bookings_booking_source_check CHECK (((booking_source)::text = ANY ((ARRAY['DIRECT_WEBSITE'::character varying, 'DIRECT_PHONE'::character varying, 'WALK_IN'::character varying, 'OTA_BOOKING_COM'::character varying, 'OTA_EXPEDIA'::character varying, 'OTA_AIRBNB'::character varying, 'OTA_OTHER'::character varying, 'CORPORATE'::character varying, 'TRAVEL_AGENT'::character varying, 'CHANNEL_MANAGER'::character varying, 'GDS'::character varying, 'GROUP'::character varying, 'LOYALTY_PROGRAM'::character varying])::text[]))),
    CONSTRAINT bookings_booking_status_check CHECK (((booking_status)::text = ANY ((ARRAY['PENDING'::character varying, 'CANCELLED'::character varying, 'CHECKED_IN'::character varying, 'CHECKED_OUT'::character varying, 'CONFIRMED'::character varying, 'COMPLETED'::character varying])::text[]))),
    CONSTRAINT bookings_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['PENDING'::character varying, 'PAID'::character varying, 'CANCELLED'::character varying, 'UNPAID'::character varying, 'FAILED'::character varying, 'REFUNDED'::character varying, 'REFUND_REQUIRED'::character varying])::text[])))
);

CREATE TABLE public.change_logs (
    id uuid NOT NULL,
    action character varying(255) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    entity_id character varying(255) NOT NULL,
    entity_type character varying(255) NOT NULL,
    new_value text,
    old_value text,
    performed_by character varying(255),
    performed_by_role character varying(255),
    summary text
);

CREATE TABLE public.channel_listings (
    id uuid NOT NULL,
    channel character varying(255) NOT NULL,
    channel_rate numeric(10,2),
    commission_pct numeric(5,2),
    created_at timestamp(6) without time zone,
    external_listing_id character varying(255),
    instant_book boolean,
    last_sync_at timestamp(6) without time zone,
    max_nights integer,
    min_nights integer,
    room_type_id character varying(255),
    room_type_name character varying(255),
    status character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT channel_listings_channel_check CHECK (((channel)::text = ANY ((ARRAY['BOOKING_COM'::character varying, 'AIRBNB'::character varying, 'EXPEDIA'::character varying, 'HOTELS_COM'::character varying, 'DIRECT'::character varying, 'AGODA'::character varying, 'TRIPADVISOR'::character varying])::text[]))),
    CONSTRAINT channel_listings_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'PAUSED'::character varying, 'ERROR'::character varying, 'DISCONNECTED'::character varying])::text[])))
);

CREATE TABLE public.channel_reservations (
    id uuid NOT NULL,
    channel character varying(255) NOT NULL,
    check_in date NOT NULL,
    check_out date NOT NULL,
    commission_amount numeric(5,2),
    external_reservation_id character varying(255) NOT NULL,
    guest_email character varying(255),
    guest_name character varying(255) NOT NULL,
    guest_phone character varying(255),
    linked_booking_id uuid,
    notes character varying(255),
    received_at timestamp(6) without time zone,
    room_number integer,
    room_type_name character varying(255),
    status character varying(255),
    total_amount numeric(10,2),
    CONSTRAINT channel_reservations_channel_check CHECK (((channel)::text = ANY ((ARRAY['BOOKING_COM'::character varying, 'AIRBNB'::character varying, 'EXPEDIA'::character varying, 'HOTELS_COM'::character varying, 'DIRECT'::character varying, 'AGODA'::character varying, 'TRIPADVISOR'::character varying])::text[])))
);

CREATE TABLE public.chat_memory (
    id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp(6) without time zone,
    guest_name character varying(255),
    handoff_requested boolean NOT NULL,
    role character varying(255) NOT NULL,
    session_id character varying(255) NOT NULL
);

CREATE TABLE public.chat_messages (
    id uuid NOT NULL,
    booking_id uuid NOT NULL,
    content character varying(4000) NOT NULL,
    hotel_id uuid,
    receiver_id uuid,
    sender_id uuid NOT NULL,
    sent_at timestamp(6) without time zone NOT NULL
);

CREATE TABLE public.concierge_requests (
    id uuid NOT NULL,
    assigned_to character varying(255),
    booking_id uuid,
    completed_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone,
    description text,
    guest_id uuid,
    guest_name character varying(255),
    requested_for timestamp(6) without time zone,
    room_number integer,
    staff_notes text,
    status character varying(255),
    type character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT concierge_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT concierge_requests_type_check CHECK (((type)::text = ANY ((ARRAY['TAXI_TRANSFER'::character varying, 'RESTAURANT_RESERVATION'::character varying, 'TOUR_EXCURSION'::character varying, 'WAKE_UP_CALL'::character varying, 'LUGGAGE_STORAGE'::character varying, 'ROOM_SERVICE'::character varying, 'SPA_APPOINTMENT'::character varying, 'CAR_RENTAL'::character varying, 'AIRPORT_PICKUP'::character varying, 'FLOWER_ARRANGEMENT'::character varying, 'BIRTHDAY_PACKAGE'::character varying, 'BUSINESS_SERVICES'::character varying, 'LAUNDRY'::character varying, 'MEDICAL_ASSISTANCE'::character varying, 'OTHER'::character varying])::text[])))
);

CREATE TABLE public.corporate_accounts (
    id uuid NOT NULL,
    address character varying(255),
    billing_cycle character varying(255),
    city character varying(255),
    company_name character varying(255) NOT NULL,
    contact_email character varying(255),
    contact_name character varying(255),
    contact_phone character varying(255),
    contract_end timestamp(6) without time zone,
    contract_number character varying(255),
    contract_start timestamp(6) without time zone,
    country character varying(255),
    created_at timestamp(6) without time zone,
    credit_limit numeric(38,2),
    currency character varying(255),
    discount_percent numeric(38,2),
    industry character varying(255),
    negotiated_rate numeric(38,2),
    notes text,
    outstanding_balance numeric(38,2),
    status character varying(255),
    updated_at timestamp(6) without time zone,
    vat_number character varying(255),
    CONSTRAINT corporate_accounts_billing_cycle_check CHECK (((billing_cycle)::text = ANY ((ARRAY['WEEKLY'::character varying, 'MONTHLY'::character varying, 'QUARTERLY'::character varying, 'PER_BOOKING'::character varying])::text[]))),
    CONSTRAINT corporate_accounts_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'SUSPENDED'::character varying, 'BLACKLISTED'::character varying, 'PROSPECT'::character varying, 'EXPIRED'::character varying])::text[])))
);

CREATE TABLE public.email_campaigns (
    id uuid NOT NULL,
    body_html character varying(8000) NOT NULL,
    created_at timestamp(6) without time zone,
    name character varying(255) NOT NULL,
    open_count integer,
    recipient_count integer,
    scheduled_at timestamp(6) without time zone,
    sent_at timestamp(6) without time zone,
    status character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    target_segment character varying(2000),
    updated_at timestamp(6) without time zone,
    CONSTRAINT email_campaigns_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SCHEDULED'::character varying, 'SENT'::character varying, 'CANCELLED'::character varying])::text[])))
);

CREATE TABLE public.feedback_review (
    id uuid NOT NULL,
    comment character varying(255),
    created_at timestamp(6) without time zone,
    feedback_text character varying(255),
    rating integer,
    guest_id uuid,
    hotel_id uuid
);

CREATE TABLE public.feedback_review_services (
    feedback_id uuid NOT NULL,
    service_id uuid NOT NULL
);

CREATE TABLE public.group_reservations (
    id uuid NOT NULL,
    agreed_rate numeric(38,2),
    breakfast_included boolean,
    check_in_date date NOT NULL,
    check_out_date date NOT NULL,
    company character varying(255),
    contact_email character varying(255),
    contact_name character varying(255),
    contact_phone character varying(255),
    created_at timestamp(6) without time zone,
    created_by character varying(255),
    currency character varying(255),
    deposit_amount numeric(38,2),
    deposit_paid boolean,
    group_name character varying(255) NOT NULL,
    hotel_id character varying(255),
    internal_notes text,
    meal_plan character varying(255),
    occasion character varying(255),
    payment_terms character varying(255),
    room_count integer NOT NULL,
    room_type_id character varying(255),
    special_requirements text,
    status character varying(255) NOT NULL,
    transfer_included boolean,
    updated_at timestamp(6) without time zone,
    CONSTRAINT group_reservations_status_check CHECK (((status)::text = ANY ((ARRAY['ENQUIRY'::character varying, 'PROVISIONAL'::character varying, 'CONFIRMED'::character varying, 'CANCELLED'::character varying, 'COMPLETED'::character varying])::text[])))
);

CREATE TABLE public.guest (
    id uuid NOT NULL,
    address character varying(255),
    birth_date date,
    country character varying(255),
    email character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    nationality character varying(255),
    passport_number character varying(255),
    phone character varying(255),
    user_id uuid
);

CREATE TABLE public.guest_communications (
    id uuid NOT NULL,
    body character varying(4000),
    contacted_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone,
    guest_email character varying(255) NOT NULL,
    guest_id uuid NOT NULL,
    guest_name character varying(255) NOT NULL,
    staff_member character varying(255),
    subject character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    CONSTRAINT guest_communications_type_check CHECK (((type)::text = ANY ((ARRAY['EMAIL'::character varying, 'PHONE_CALL'::character varying, 'SMS'::character varying, 'IN_PERSON'::character varying, 'WHATSAPP'::character varying, 'NOTE'::character varying])::text[])))
);

CREATE TABLE public.guest_loyalty (
    id uuid NOT NULL,
    guest_email character varying(255) NOT NULL,
    guest_id uuid NOT NULL,
    guest_name character varying(255) NOT NULL,
    points integer NOT NULL,
    tier character varying(255) NOT NULL,
    total_spent numeric(12,2) NOT NULL,
    total_stays integer NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT guest_loyalty_tier_check CHECK (((tier)::text = ANY ((ARRAY['BRONZE'::character varying, 'SILVER'::character varying, 'GOLD'::character varying, 'PLATINUM'::character varying])::text[])))
);

CREATE TABLE public.guest_preferences (
    id uuid NOT NULL,
    accessible_room boolean,
    allergies character varying(255),
    bed_type character varying(255),
    dietary_restrictions character varying(255),
    early_check_in boolean,
    extra_pillows boolean,
    extra_towels boolean,
    guest_id uuid NOT NULL,
    high_floor boolean,
    internal_notes text,
    late_check_out boolean,
    pillow character varying(255),
    quiet_room boolean,
    room_floor character varying(255),
    smoking_preference character varying(255),
    special_requests text,
    updated_at timestamp(6) without time zone,
    view_preference character varying(255)
);

CREATE TABLE public.hotels (
    id uuid NOT NULL,
    address character varying(255),
    cancellation_policy character varying(255),
    check_in_time character varying(255),
    check_out_time character varying(255),
    city character varying(255),
    country character varying(255),
    currency character varying(255),
    description character varying(255),
    email character varying(255),
    image_id character varying(255),
    image_name character varying(255),
    latitude double precision,
    longitude double precision,
    name character varying(255) NOT NULL,
    phone character varying(255),
    rating double precision,
    star_rating integer,
    tax_id character varying(255),
    timezone character varying(255),
    website character varying(255)
);

CREATE TABLE public.housekeeping_tasks (
    id uuid NOT NULL,
    assigned_to character varying(255),
    completed_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone,
    notes character varying(255),
    priority character varying(255),
    room_id character varying(255),
    room_number integer NOT NULL,
    scheduled_at timestamp(6) without time zone NOT NULL,
    status character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT housekeeping_tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[]))),
    CONSTRAINT housekeeping_tasks_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'DONE'::character varying, 'SKIPPED'::character varying])::text[]))),
    CONSTRAINT housekeeping_tasks_type_check CHECK (((type)::text = ANY ((ARRAY['DAILY_CLEAN'::character varying, 'DEEP_CLEAN'::character varying, 'TURNDOWN'::character varying, 'CHECKOUT_CLEAN'::character varying, 'INSPECTION'::character varying])::text[])))
);

CREATE TABLE public.inventory_items (
    id uuid NOT NULL,
    active boolean NOT NULL,
    category character varying(255) NOT NULL,
    current_stock integer NOT NULL,
    hotel_id uuid,
    min_stock integer NOT NULL,
    name character varying(255) NOT NULL,
    unit_cost numeric(10,2) NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT inventory_items_category_check CHECK (((category)::text = ANY ((ARRAY['MINIBAR'::character varying, 'AMENITY'::character varying, 'LINEN'::character varying, 'CLEANING'::character varying, 'SUPPLIES'::character varying, 'OTHER'::character varying])::text[])))
);

CREATE TABLE public.inventory_movements (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    direction character varying(255) NOT NULL,
    item_id uuid NOT NULL,
    item_name character varying(255) NOT NULL,
    note character varying(255),
    quantity integer NOT NULL,
    room_id uuid,
    staff_name character varying(255)
);

CREATE TABLE public.invoices (
    id uuid NOT NULL,
    amount numeric(38,2),
    invoice_number character varying(255) NOT NULL,
    issued_date timestamp(6) without time zone,
    pdf_url character varying(255),
    status character varying(255),
    booking_id uuid NOT NULL,
    CONSTRAINT invoices_status_check CHECK (((status)::text = ANY ((ARRAY['GENERATED'::character varying, 'SENT'::character varying, 'UNPAID'::character varying, 'CANCELLED'::character varying, 'PAID'::character varying, 'CREDIT_NOTE_REQUIRED'::character varying])::text[])))
);

CREATE TABLE public.knowledge_base (
    id uuid NOT NULL,
    active boolean NOT NULL,
    category character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp(6) without time zone,
    priority integer NOT NULL,
    tags character varying(255),
    title character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone
);

CREATE TABLE public.maintenance_requests (
    id uuid NOT NULL,
    assigned_to character varying(255),
    category character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    description character varying(2000),
    priority character varying(255) NOT NULL,
    reported_at timestamp(6) without time zone NOT NULL,
    reported_by character varying(255),
    resolution_notes character varying(255),
    resolved_at timestamp(6) without time zone,
    room_id character varying(255),
    room_number integer NOT NULL,
    status character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT maintenance_requests_category_check CHECK (((category)::text = ANY ((ARRAY['PLUMBING'::character varying, 'ELECTRICAL'::character varying, 'HVAC'::character varying, 'FURNITURE'::character varying, 'APPLIANCE'::character varying, 'STRUCTURAL'::character varying, 'CLEANING'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT maintenance_requests_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying])::text[]))),
    CONSTRAINT maintenance_requests_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'IN_PROGRESS'::character varying, 'ON_HOLD'::character varying, 'RESOLVED'::character varying, 'CLOSED'::character varying])::text[])))
);

CREATE TABLE public.online_checkins (
    id uuid NOT NULL,
    address character varying(255),
    airport_transfer boolean,
    booking_id uuid NOT NULL,
    confirmation_code character varying(255),
    date_of_birth character varying(255),
    early_check_in boolean,
    estimated_arrival_time character varying(255),
    extra_bed boolean,
    guest_email character varying(255) NOT NULL,
    guest_first_name character varying(255) NOT NULL,
    guest_last_name character varying(255) NOT NULL,
    late_check_out boolean,
    nationality character varying(255),
    passport_number character varying(255),
    processed_at timestamp(6) without time zone,
    special_requests character varying(255),
    status character varying(255) NOT NULL,
    submitted_at timestamp(6) without time zone,
    CONSTRAINT online_checkins_status_check CHECK (((status)::text = ANY ((ARRAY['SUBMITTED'::character varying, 'REVIEWED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);

CREATE TABLE public.payments (
    id uuid NOT NULL,
    amount numeric(38,2) NOT NULL,
    card_number character varying(255),
    cvv character varying(255),
    expiry character varying(255),
    guest_address character varying(255),
    guest_email character varying(255),
    guest_id uuid,
    guest_name character varying(255),
    payment_date timestamp(6) without time zone NOT NULL,
    payment_method character varying(255) NOT NULL,
    status character varying(255),
    booking_id uuid,
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PAID'::character varying, 'CANCELLED'::character varying, 'UNPAID'::character varying, 'FAILED'::character varying, 'REFUNDED'::character varying, 'REFUND_REQUIRED'::character varying])::text[])))
);

CREATE TABLE public.pricing_rules (
    id uuid NOT NULL,
    active boolean NOT NULL,
    adjustment_fixed numeric(10,2),
    adjustment_percent numeric(6,2),
    apply_to_room_type_id character varying(255),
    condition_days_before_arrival integer,
    condition_min_nights integer,
    condition_occupancy_pct_max integer,
    condition_occupancy_pct_min integer,
    created_at timestamp(6) without time zone,
    description character varying(1000),
    name character varying(255) NOT NULL,
    priority integer NOT NULL,
    type character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    valid_from date,
    valid_to date,
    CONSTRAINT pricing_rules_type_check CHECK (((type)::text = ANY ((ARRAY['SEASONAL'::character varying, 'LAST_MINUTE'::character varying, 'EARLY_BIRD'::character varying, 'WEEKEND'::character varying, 'OCCUPANCY_BASED'::character varying, 'LONG_STAY'::character varying, 'EVENT'::character varying, 'CUSTOM'::character varying])::text[])))
);

CREATE TABLE public.rate_plans (
    id uuid NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    description character varying(1000),
    discount_percent numeric(5,2) NOT NULL,
    min_nights integer,
    name character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    updated_at timestamp(6) without time zone,
    valid_from date,
    valid_to date,
    CONSTRAINT rate_plans_type_check CHECK (((type)::text = ANY ((ARRAY['STANDARD'::character varying, 'EARLY_BIRD'::character varying, 'LAST_MINUTE'::character varying, 'WEEKEND'::character varying, 'LONG_STAY'::character varying, 'CORPORATE'::character varying, 'PROMOTIONAL'::character varying])::text[])))
);

CREATE TABLE public.room (
    id uuid NOT NULL,
    description character varying(255),
    floor character varying(255),
    hotel_name character varying(255),
    image_url character varying(255),
    price numeric(38,2),
    room_number integer NOT NULL,
    room_status character varying(255) NOT NULL,
    hotel_id uuid NOT NULL,
    room_type_id uuid NOT NULL,
    CONSTRAINT room_room_status_check CHECK (((room_status)::text = ANY ((ARRAY['FREE'::character varying, 'OCCUPIED'::character varying, 'RESERVED'::character varying, 'MAINTENANCE'::character varying])::text[])))
);

CREATE TABLE public.room_charges (
    id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    booking_id uuid NOT NULL,
    category character varying(255) NOT NULL,
    charged_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone,
    description character varying(255) NOT NULL,
    guest_name character varying(255) NOT NULL,
    quantity integer,
    room_number integer NOT NULL,
    staff_member character varying(255),
    status character varying(255) NOT NULL,
    CONSTRAINT room_charges_category_check CHECK (((category)::text = ANY ((ARRAY['MINIBAR'::character varying, 'RESTAURANT'::character varying, 'SPA'::character varying, 'LAUNDRY'::character varying, 'PARKING'::character varying, 'ROOM_SERVICE'::character varying, 'TELEPHONE'::character varying, 'INTERNET'::character varying, 'EXCURSION'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT room_charges_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ADDED_TO_BILL'::character varying, 'PAID'::character varying, 'VOIDED'::character varying])::text[])))
);

CREATE TABLE public.room_types (
    id uuid NOT NULL,
    air_conditioning boolean NOT NULL,
    allergy_free_room boolean NOT NULL,
    balcony boolean NOT NULL,
    bed boolean NOT NULL,
    capacity integer NOT NULL,
    carpeted boolean NOT NULL,
    city_view boolean NOT NULL,
    clothes_rack boolean NOT NULL,
    description character varying(400),
    desk boolean NOT NULL,
    electric_kettle boolean NOT NULL,
    facilities_for_disabled_guests boolean NOT NULL,
    fitness_centre boolean NOT NULL,
    flat_screen_tv boolean NOT NULL,
    free_wifi boolean NOT NULL,
    hair_dryer boolean NOT NULL,
    heating boolean NOT NULL,
    image_url character varying(255),
    internet boolean NOT NULL,
    ironing_facilities boolean NOT NULL,
    laptop_safe boolean NOT NULL,
    lift boolean NOT NULL,
    linen boolean NOT NULL,
    minibar boolean NOT NULL,
    name character varying(255) NOT NULL,
    non_smoking_room boolean NOT NULL,
    price_per_night numeric(38,2),
    room_service boolean NOT NULL,
    safe boolean NOT NULL,
    satellite_channels boolean NOT NULL,
    shower boolean NOT NULL,
    socket_near_bed boolean NOT NULL,
    soundproofing boolean NOT NULL,
    telephone boolean NOT NULL,
    toilet boolean NOT NULL,
    towels boolean NOT NULL,
    tv boolean NOT NULL,
    upper_floor_accessible boolean NOT NULL,
    wake_up_service boolean NOT NULL,
    wardrobe boolean NOT NULL
);

CREATE TABLE public.service_entity (
    id uuid NOT NULL,
    description character varying(255),
    name character varying(255),
    price numeric(38,2)
);

CREATE TABLE public.service_request (
    id uuid NOT NULL,
    description character varying(255),
    request_date timestamp(6) without time zone,
    status character varying(255),
    booking_id uuid,
    guest_id uuid NOT NULL,
    service_id uuid NOT NULL,
    CONSTRAINT service_request_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying])::text[])))
);

CREATE TABLE public.shift_schedules (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    date date,
    department character varying(255),
    notes character varying(255),
    shift_end character varying(255),
    shift_start character varying(255),
    staff_id uuid,
    staff_name character varying(255),
    status character varying(255),
    CONSTRAINT shift_schedules_status_check CHECK (((status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'CONFIRMED'::character varying, 'ABSENT'::character varying, 'COMPLETED'::character varying])::text[])))
);

CREATE TABLE public.staff (
    id uuid NOT NULL,
    date_of_birth date,
    email character varying(255),
    first_name character varying(255),
    hire_date date,
    hotel_name character varying(255),
    last_name character varying(255),
    phone character varying(255),
    positions character varying(255),
    salary numeric(38,2),
    hotel_id uuid NOT NULL
);

CREATE TABLE public.token (
    id uuid NOT NULL,
    expired boolean NOT NULL,
    revoked boolean NOT NULL,
    token text NOT NULL,
    token_type character varying(255),
    user_id uuid,
    CONSTRAINT token_token_type_check CHECK (((token_type)::text = 'BEARER'::text))
);

CREATE TABLE public.users (
    id uuid NOT NULL,
    is_demo boolean NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255),
    role character varying(255),
    staff_id uuid,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'USER'::character varying, 'RECEPTION'::character varying])::text[])))
);

CREATE TABLE public.vouchers (
    id uuid NOT NULL,
    active boolean,
    code character varying(255) NOT NULL,
    created_at timestamp(6) without time zone,
    created_by character varying(255),
    description text,
    discount_type character varying(255),
    discount_value numeric(10,2) NOT NULL,
    hotel_id character varying(255),
    max_discount_amount numeric(38,2),
    min_nights integer,
    name character varying(255) NOT NULL,
    room_type_id character varying(255),
    usage_limit integer,
    used_count integer,
    valid_from date,
    valid_to date,
    CONSTRAINT vouchers_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['PERCENTAGE'::character varying, 'FIXED'::character varying])::text[])))
);

CREATE TABLE public.webhook_deliveries (
    id uuid NOT NULL,
    delivered_at timestamp(6) without time zone,
    error text,
    event character varying(255),
    payload text,
    status_code integer,
    subscription_id uuid
);

CREATE TABLE public.webhook_subscriptions (
    id uuid NOT NULL,
    active boolean NOT NULL,
    created_at timestamp(6) without time zone,
    events character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    secret character varying(255),
    target_url character varying(255) NOT NULL
);

ALTER TABLE ONLY public.ai_call_log
    ADD CONSTRAINT ai_call_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app_notifications
    ADD CONSTRAINT app_notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.change_logs
    ADD CONSTRAINT change_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.channel_listings
    ADD CONSTRAINT channel_listings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.channel_reservations
    ADD CONSTRAINT channel_reservations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_memory
    ADD CONSTRAINT chat_memory_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.concierge_requests
    ADD CONSTRAINT concierge_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.corporate_accounts
    ADD CONSTRAINT corporate_accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.email_campaigns
    ADD CONSTRAINT email_campaigns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.feedback_review
    ADD CONSTRAINT feedback_review_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.group_reservations
    ADD CONSTRAINT group_reservations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guest_communications
    ADD CONSTRAINT guest_communications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guest_loyalty
    ADD CONSTRAINT guest_loyalty_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guest
    ADD CONSTRAINT guest_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.guest_preferences
    ADD CONSTRAINT guest_preferences_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.housekeeping_tasks
    ADD CONSTRAINT housekeeping_tasks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.online_checkins
    ADD CONSTRAINT online_checkins_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.rate_plans
    ADD CONSTRAINT rate_plans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.room_charges
    ADD CONSTRAINT room_charges_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.room
    ADD CONSTRAINT room_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.service_entity
    ADD CONSTRAINT service_entity_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.service_request
    ADD CONSTRAINT service_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shift_schedules
    ADD CONSTRAINT shift_schedules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.token
    ADD CONSTRAINT token_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT uk_30ftp2biebbvpik8e49wlmady UNIQUE (code);

ALTER TABLE ONLY public.guest_loyalty
    ADD CONSTRAINT uk_4eoj3a6hvptvn3ov7jf6qheqw UNIQUE (guest_id);

ALTER TABLE ONLY public.guest_preferences
    ADD CONSTRAINT uk_5ewwf8n3n64a4ox99vw69469q UNIQUE (guest_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk_6dotkott2kjsp8vw4d0m25fb7 UNIQUE (email);

ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT uk_b70k1tp1aa52elkkxht660u36 UNIQUE (name);

ALTER TABLE ONLY public.guest
    ADD CONSTRAINT uk_chdaocwoknpkpjjcb6dyv8os8 UNIQUE (user_id);

ALTER TABLE ONLY public.room
    ADD CONSTRAINT uk_fvetq5dj3wcvmdf19bbof0os6 UNIQUE (room_number);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uk_hijqejqge8g6evxs6j44rny9k UNIQUE (staff_id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT uk_l1x55mfsay7co0r3m9ynvipd5 UNIQUE (invoice_number);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT uk_nuscjm6x127hkb15kcb8n56wo UNIQUE (booking_id);

ALTER TABLE ONLY public.token
    ADD CONSTRAINT uk_pddrhgwxnms2aceeku9s2ewy5 UNIQUE (token);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT uk_qn380ix1ge287r0rd8th12bwi UNIQUE (booking_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_pkey PRIMARY KEY (id);

CREATE INDEX idx_ailog_created ON public.ai_call_log USING btree (created_at);

CREATE INDEX idx_ailog_endpoint ON public.ai_call_log USING btree (endpoint);

CREATE INDEX idx_chat_created ON public.chat_memory USING btree (created_at);

CREATE INDEX idx_chat_session ON public.chat_memory USING btree (session_id);

CREATE INDEX idx_kb_active ON public.knowledge_base USING btree (active);

CREATE INDEX idx_kb_category ON public.knowledge_base USING btree (category);

ALTER TABLE ONLY public.booking_services
    ADD CONSTRAINT fk1etky587qu1tqlr3t1r7w59gx FOREIGN KEY (booking_id) REFERENCES public.bookings(id);

ALTER TABLE ONLY public.service_request
    ADD CONSTRAINT fk8k8wh1vu4p4tmyd2o1yb72n1n FOREIGN KEY (guest_id) REFERENCES public.guest(id);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fk8vu9svt797v64um9yqrva6tak FOREIGN KEY (guest_id) REFERENCES public.guest(id);

ALTER TABLE ONLY public.service_request
    ADD CONSTRAINT fk95gjuaqwn0hwv53liqsa8ks0g FOREIGN KEY (service_id) REFERENCES public.service_entity(id);

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fkathvvidp8xibgf9rd2c6vvkmp FOREIGN KEY (room_id) REFERENCES public.room(id);

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fkb9bhb7xre5v64qvjeholh3qj0 FOREIGN KEY (booking_id) REFERENCES public.bookings(id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fkbglg01rrxvu2s48rjyopyexkj FOREIGN KEY (staff_id) REFERENCES public.staff(id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fkc52o2b1jkxttngufqp3t7jr3h FOREIGN KEY (booking_id) REFERENCES public.bookings(id);

ALTER TABLE ONLY public.feedback_review_services
    ADD CONSTRAINT fkdsq7i32sk1w3ayq9a550gq2qm FOREIGN KEY (feedback_id) REFERENCES public.feedback_review(id);

ALTER TABLE ONLY public.feedback_review
    ADD CONSTRAINT fke21vsccv2miyc6tjfidhqbiiq FOREIGN KEY (hotel_id) REFERENCES public.hotels(id);

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT fkev0ps7gpx9wi7kuivv0bc05ss FOREIGN KEY (hotel_id) REFERENCES public.hotels(id);

ALTER TABLE ONLY public.service_request
    ADD CONSTRAINT fkf9pt7als5qg2uh3yfpfcp71cb FOREIGN KEY (booking_id) REFERENCES public.bookings(id);

ALTER TABLE ONLY public.booking_services
    ADD CONSTRAINT fkg57kqbunvc6s8sshp0p7xiby2 FOREIGN KEY (service_id) REFERENCES public.service_entity(id);

ALTER TABLE ONLY public.feedback_review_services
    ADD CONSTRAINT fkgixo7ykfvhfawa2ufwsnpkvwt FOREIGN KEY (service_id) REFERENCES public.service_entity(id);

ALTER TABLE ONLY public.token
    ADD CONSTRAINT fkj8rfw4x0wjjyibfqq566j4qng FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.room
    ADD CONSTRAINT fkkuv8pfar671aoqokwawl8bpon FOREIGN KEY (room_type_id) REFERENCES public.room_types(id);

ALTER TABLE ONLY public.feedback_review
    ADD CONSTRAINT fkle5c5ybgjie7imviplxhh4wly FOREIGN KEY (guest_id) REFERENCES public.guest(id);

ALTER TABLE ONLY public.room
    ADD CONSTRAINT fkr1kapilxkn8oyx1gr91g6x8cj FOREIGN KEY (hotel_id) REFERENCES public.hotels(id);

ALTER TABLE ONLY public.guest
    ADD CONSTRAINT fkr8orjge9i7ui3qys8ixgy7yqj FOREIGN KEY (user_id) REFERENCES public.users(id);

