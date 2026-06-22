# 🏨 HotelBooking — სრული სისტემის გეგმა

═══════════════════════════════════════════════════════════════════════════════

## 1. მთლიანი არქიტექტურა

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BROWSER / MOBILE                                │
│                                                                         │
│   👤 USER          👔 RECEPTION          👑 ADMIN                       │
│   /book            /bookings             /dashboard                     │
│   /guest-functions /guests               /admin                         │
│   /room-types      /housekeeping         /employees                     │
│   /ai-assistant    /checkins             /pricing-rules                 │
│                    /pos                  /reports                       │
└────────────────────────┬────────────────────────────────────────────────┘
                         │  HTTPS  (Cloudflare Tunnel / Nginx)
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   NEXT.JS 15  (Frontend  :3000)                         │
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐   │
│  │ axiosConfig  │   │  auth utils  │   │   SidebarContext          │   │
│  │ baseURL=env  │   │  JWT decode  │   │   Role-based nav          │   │
│  │ Bearer token │   │  saveToken() │   │   48 routes               │   │
│  └──────┬───────┘   └──────────────┘   └──────────────────────────┘   │
└─────────┼───────────────────────────────────────────────────────────────┘
          │  REST/JSON  +  WebSocket (STOMP)
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  SPRING BOOT 3.2  (Backend  :8080)                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SecurityConfig  (JWT Filter → Role Check → Controller)         │   │
│  │  CORS: *, Methods: GET/POST/PUT/PATCH/DELETE/OPTIONS            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  auth    │ │ booking  │ │  guest   │ │   room   │ │ payment  │   │
│  │ /api/auth│ │/api/book.│ │/api/gue. │ │/api/room.│ │/api/pay. │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ invoice  │ │ checkin  │ │housekeep.│ │maintain. │ │   crm    │   │
│  │/api/inv. │ │/api/chk. │ │/api/hsk. │ │/api/mnt. │ │/api/crm  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │   pos    │ │ channel  │ │ pricing  │ │ loyalty  │ │    ai    │   │
│  │/api/pos  │ │/api/chn. │ │/api/pri. │ │/api/loy. │ │/api/ai   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │  JPA / Hibernate
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL  :5432                                 │
│                                                                         │
│  hotels  rooms  room_types  guests  bookings  payments  invoices        │
│  staff  services  service_requests  feedback_review  notifications      │
│  housekeeping_tasks  maintenance_requests  loyalty  rate_plans          │
│  pricing_rules  channel_listings  channel_reservations  room_charges   │
│  online_check_ins  crm_communications  campaigns  chat_messages        │
│  ai_messages  app_users                                                 │
└─────────────────────────────────────────────────────────────────────────┘
          │
          │  External APIs
          ▼
┌──────────────────────┐   ┌──────────────────┐   ┌────────────────────┐
│  Anthropic Claude    │   │     Stripe        │   │   Spring Mail      │
│  /api/ai/chat        │   │  /api/payments    │   │  Email Campaigns   │
│  AI Assistant        │   │  Checkout         │   │  /api/crm/send     │
└──────────────────────┘   └──────────────────┘   └────────────────────┘
```

═══════════════════════════════════════════════════════════════════════════

## 2. მომხმარებლის მოგზაურობა (User Journeys)

### 🌐 სტუმარი (USER) — ოთახის დაჯავშნა

```
სტუმარი სახლიდან
      │
      ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  /register  │────▶│  /login      │────▶│  /room-types        │
│  POST auth  │     │  POST auth   │     │  GET /api/room-types │
│  JWT token  │     │  JWT speich. │     │  ოთახის ტიპები       │
└─────────────┘     └──────────────┘     └──────────┬──────────┘
                                                     │ აირჩია ტიპი
                                                     ▼
┌────────────────────┐     ┌──────────────────────────────────────┐
│  /book/checkout    │◀────│  /book                               │
│  POST public/book  │     │  GET public/available-rooms          │
│  შეყვანა:          │     │  ▸ checkIn / checkOut / guests       │
│  სახელი, ბარათი    │     │  ▸ ფასის გამოთვლა                   │
└─────────┬──────────┘     └──────────────────────────────────────┘
          │ წარმატება
          ▼
┌──────────────────────┐     ┌─────────────────────────────────────┐
│  დადასტურება         │────▶│  /guest-functions                   │
│  bookingId + email   │     │  GET public/my-bookings?email=      │
│  confirmationCode    │     │  ▸ ჯავშნების ნახვა                  │
└──────────────────────┘     │  ▸ გაუქმება                        │
                             └─────────────────────────────────────┘
          │
          ▼
┌──────────────────────┐
│  /guest-checkin      │  (ჩასვლამდე)
│  POST public/        │
│  online-checkin      │
│  ▸ პასპორტი          │
│  ▸ ჩასვლის დრო      │
│  ▸ დამატებითი სერვ.  │
└──────────────────────┘
```

---

### 👔 რეცეფცია (RECEPTION) — ყოველდღიური სამუშაო

```
RECEPTION შედის სისტემაში
      │
      ├──▶ /bookings ──────────────────────────────────────┐
      │    GET /api/bookings                               │
      │    ▸ ყველა ჯავშანი                                │
      │    ▸ Check-In ──▶ PUT /api/bookings/{id}/checkin  │
      │    ▸ Check-Out ─▶ PUT /api/bookings/{id}/checkout │
      │    ▸ გაუქმება ──▶ PUT /api/bookings/{id}/cancel   │
      │                                                    │
      ├──▶ /checkins ──────────────────────────────────────┤
      │    GET /api/checkins (ონლაინ მოთხოვნები)          │
      │    GET /api/checkins/stats                         │
      │    ▸ დამტკიცება ─▶ PATCH /api/checkins/{id}/approve
      │    ▸ უარყოფა ───▶ PATCH /api/checkins/{id}/reject │
      │                                                    │
      ├──▶ /guests ────────────────────────────────────────┤
      │    GET /api/guests                                 │
      │    POST /api/guests (სტუმრის დამატება)            │
      │    GET /api/crm/guests/{id}/profile (360°)        │
      │                                                    │
      ├──▶ /housekeeping ──────────────────────────────────┤
      │    GET /api/housekeeping                           │
      │    POST /api/housekeeping (დავალების შექმნა)       │
      │    PATCH /api/housekeeping/{id}/status             │
      │    PATCH /api/housekeeping/{id}/assign             │
      │                                                    │
      ├──▶ /pos ───────────────────────────────────────────┤
      │    GET /api/pos + /api/pos/stats                   │
      │    POST /api/pos (ოთახის გადასახადი)               │
      │    PATCH /api/pos/{id}/void                        │
      │                                                    │
      └──▶ /loyalty ───────────────────────────────────────┘
           GET /api/loyalty
           POST /api/loyalty/award
           PATCH /api/loyalty/{id}/redeem
```

---

### 👑 ადმინი (ADMIN) — სრული კონტროლი

```
ADMIN — ყველა RECEPTION ფუნქცია + დამატებით:
      │
      ├──▶ /dashboard ────────────────────────────────────────┐
      │    GET /api/admin/stats                               │
      │    GET /api/admin/monthly-revenue                     │
      │    GET /api/admin/booking-status-summary              │
      │                                                       │
      ├──▶ /reports ──────────────────────────────────────────┤
      │    GET /api/admin/stats                               │
      │    GET /api/admin/monthly-revenue                     │
      │    CSV Export (კლიენტ-მხარეს)                        │
      │                                                       │
      ├──▶ /kpi ──────────────────────────────────────────────┤
      │    GET /api/admin/kpi                                 │
      │    GET /api/admin/forecast                            │
      │                                                       │
      ├──▶ /employees ────────────────────────────────────────┤
      │    GET /api/staff                                     │
      │    POST /api/staff (hotelId სავალდებულო)             │
      │                                                       │
      ├──▶ /invoices ─────────────────────────────────────────┤
      │    GET /api/invoices                                  │
      │    POST /api/invoices/{bookingId} (გენერაცია)        │
      │    GET /api/invoices/{id}/pdf (PDF ჩამოტვირთვა)      │
      │    PUT /api/invoices/{id}/paid|unpaid|cancelled       │
      │                                                       │
      ├──▶ /pricing-rules ────────────────────────────────────┤
      │    GET /api/pricing-rules                             │
      │    POST /api/pricing-rules                            │
      │    PATCH /api/pricing-rules/{id}/toggle               │
      │    GET /api/pricing-rules/simulate?basePrice=&nights= │
      │                                                       │
      ├──▶ /campaigns ────────────────────────────────────────┤
      │    GET /api/crm/campaigns                             │
      │    POST /api/crm/campaigns                            │
      │    POST /api/crm/campaigns/{id}/send ──▶ Spring Mail  │
      │                                                       │
      └──▶ /channel-manager ──────────────────────────────────┘
           GET /api/channels/listings + reservations + stats
           POST /api/channels/listings/{id}/sync
           PATCH reservations/{id}/confirm|cancel
```

═══════════════════════════════════════════════════════════════════════════

## 3. მონაცემთა ბაზის კავშირები (Entity Relationships)

```
                    ┌─────────────┐
                    │   AppUser   │
                    │ id,email    │
                    │ role,pass   │
                    └──────┬──────┘
                  ┌────────┴────────┐
                  │ 1:1             │ 1:1
                  ▼                 ▼
           ┌──────────┐      ┌──────────┐
           │  Guest   │      │  Staff   │
           │ id,name  │      │ id,name  │
           │ email    │      │ position │
           │ phone    │      │ salary   │
           └────┬─────┘      └────┬─────┘
                │                 │ M:1
         ┌──────┼──────┐          ▼
         │      │      │    ┌──────────┐
        M:1    M:1    M:1   │  Hotel   │◀─────M:1──── Room
         │      │      │    │ id,name  │              │
         ▼      ▼      ▼    │ address  │              │ M:1
    ┌────────┐ ┌────┐ ┌───────────┐   └──────────┘   ▼
    │Booking │ │Srv │ │FeedbackRev│            ┌──────────┐
    │id      │ │Req │ │text,rating│            │ RoomType │
    │checkIn │ └────┘ │comment    │            │ name     │
    │checkOut│        └───────────┘            │ price    │
    │status  │                                 │ amenities│
    └────┬───┘                                 └──────────┘
    ┌────┼────┬────────┬────────────┐
    │    │    │        │            │
   1:1  1:1  M:M     M:1          M:1
    │    │    │        │            │
    ▼    ▼    ▼        ▼            ▼
┌───────┐ ┌───────┐ ┌─────────┐ ┌───────┐ ┌───────────┐
│Payment│ │Invoice│ │Service  │ │Online │ │RoomCharge │
│amount │ │number │ │name     │ │CheckIn│ │(POS)      │
│method │ │pdf    │ │price    │ │status │ │amount     │
│status │ │status │ └─────────┘ └───────┘ └───────────┘
└───────┘ └───────┘

            GuestLoyalty ◀──── Guest (guestId)
            points, tier
            totalStays

            GuestCommunication ◀──── Guest (guestId)
            type, notes

            ChatMessage ◀──── Booking (bookingId)
            sender, content

            HousekeepingTask    MaintenanceRequest
            roomId, status      roomId, priority

            ChannelListing ◀──── RoomType (roomTypeId)
            channel, rate

            PricingRule          RatePlan
            type, adjustment     discount, minNights
```

═══════════════════════════════════════════════════════════════════════════

## 4. API ენდფოინტების სრული რუქა

```
PUBLIC (ავტორიზაცია არ სჭირდება)
══════════════════════════════════════════════════
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/rooms/availability
GET    /api/public/bookings/available-rooms
GET    /api/public/bookings/my-bookings?email=
POST   /api/public/bookings/direct
POST   /api/public/bookings/{id}/cancel
POST   /api/public/online-checkin
GET    /api/public/online-checkin/status?email=
GET    /uploads/**  (სტატიკური ფაილები)
GET    /roomtype/**

USER + RECEPTION + ADMIN
══════════════════════════════════════════════════
GET    /api/user/me
POST   /api/user/change-password
GET    /api/room-types
GET    /api/rooms
GET    /api/rooms/available
GET    /api/hotels
GET    /api/bookings
GET    /api/guests
GET    /api/services
GET    /api/feedback-reviews
GET    /api/payments
GET    /api/servicerequests
POST   /api/feedback-reviews
POST   /api/ai/chat
GET    /api/ai/history/{sessionId}
DELETE /api/ai/history/{sessionId}
GET    /api/chat/{bookingId}/messages
POST   /api/chat/start
GET    /api/notifications
PATCH  /api/notifications/{id}/read

RECEPTION + ADMIN
══════════════════════════════════════════════════
POST   /api/bookings              POST   /api/guests
PUT    /api/bookings/{id}         PUT    /api/guests/{id}
PUT    /api/bookings/{id}/checkin POST   /api/payments
PUT    /api/bookings/{id}/checkout POST  /api/servicerequests
PUT    /api/bookings/{id}/cancel  PUT    /api/servicerequests/{id}
POST   /api/bookings/calculate
GET    /api/checkins              PATCH  /api/checkins/{id}/approve
GET    /api/checkins/stats        PATCH  /api/checkins/{id}/reject
POST   /api/housekeeping          PUT    /api/housekeeping/{id}
PATCH  /api/housekeeping/{id}/status
PATCH  /api/housekeeping/{id}/assign
POST   /api/maintenance           PUT    /api/maintenance/{id}
PATCH  /api/maintenance/{id}/status
POST   /api/loyalty/award         PATCH  /api/loyalty/{id}/redeem
POST   /api/rate-plans            PUT    /api/rate-plans/{id}
PATCH  /api/rate-plans/{id}/toggle
POST   /api/pos                   PATCH  /api/pos/{id}/void
GET    /api/crm/**                POST   /api/crm/communications
GET    /api/channels/**           POST   /api/channels/listings/{id}/sync
PATCH  /api/channels/reservations/{id}/confirm|cancel

ADMIN ONLY
══════════════════════════════════════════════════
GET    /api/admin/stats           GET    /api/admin/kpi
GET    /api/admin/monthly-revenue GET    /api/admin/forecast
GET    /api/admin/booking-status-summary
POST   /api/hotels/save           PUT    /api/hotels/{id}
DELETE /api/hotels/{id}
POST   /api/rooms/save            DELETE /api/rooms/{id}
POST   /api/room-types            DELETE /api/room-types/{id}
POST   /api/invoices/{bookingId}  PUT    /api/invoices/{id}/paid
GET    /api/invoices/{id}/pdf     PUT    /api/invoices/{id}/unpaid
DELETE /api/invoices/{id}
POST   /api/staff                 PUT    /api/staff/{id}
DELETE /api/staff/{id}
POST   /api/pricing-rules         PUT    /api/pricing-rules/{id}
PATCH  /api/pricing-rules/{id}/toggle
GET    /api/pricing-rules/simulate
POST   /api/crm/campaigns         PUT    /api/crm/campaigns/{id}
POST   /api/crm/campaigns/{id}/send
DELETE /api/**  (ყველა წაშლა)
```

═══════════════════════════════════════════════════════════════════════════

## 5. ფუნქციების კავშირი — ნაკადის დიაგრამა

```
╔══════════════════════════════════════════════════════════════════════╗
║                    სტუმრის სრული ციკლი                              ║
╚══════════════════════════════════════════════════════════════════════╝

     HOTEL ──────────▶ ROOM TYPE ──────────▶ ROOM
       │                    │                  │
       │ შეიცავს            │ განსაზღვრავს      │ მიეკუთვნება
       │                    │                  │
       ▼                    ▼                  ▼
     STAFF              PRICING RULES       BOOKING ◀──── GUEST
       │                RATE PLANS            │               │
       │ მუშაობს         │                    │               │
       │                 │ ახდენს გავლენას    │               │
       ▼                 ▼                    │               │
  RECEPTION ──────▶ PRICE CALC ──────────────┘               │
                                              │               │
                          ┌───────────────────┘               │
                          │                                   │
                    ┌─────┴──────┐                           │
                    │            │                            │
                    ▼            ▼                            │
                PAYMENT       ONLINE                         │
                  │           CHECK-IN                        │
                  │              │                            │
                  ▼              ▼                            │
               INVOICE     CHECKIN REQUEST                   │
                  │         (staff approves)                  │
                  │                                           │
                  ▼                                           │
              PDF DOWNLOAD                                   │
                                                             │
                          ┌──────────────────────────────────┘
                          │
               ┌──────────┴──────────┐
               │                     │
               ▼                     ▼
         SERVICE REQUEST         FEEDBACK
               │                REVIEW
               │                     │
               ▼                     ▼
          HOUSEKEEPING            LOYALTY
          MAINTENANCE             POINTS
               │
               ▼
          POS CHARGES
          (room charges)


╔══════════════════════════════════════════════════════════════════════╗
║                    მართვის ნაკადი                                    ║
╚══════════════════════════════════════════════════════════════════════╝

  PRICING RULES ────┐
  RATE PLANS ───────┼───▶ BOOKING PRICE CALCULATION
  CHANNEL MANAGER ──┘
         │
         │ ოთახი ჩამოიტვირთება
         ▼
  CHANNEL RESERVATION ──▶ BOOKING (confirm) ──▶ PAYMENT
                                                     │
                                              ──▶ INVOICE (PDF)


╔══════════════════════════════════════════════════════════════════════╗
║                    კომუნიკაციის ნაკადი                              ║
╚══════════════════════════════════════════════════════════════════════╝

  GUEST ──▶ CRM 360° PROFILE ──▶ COMMUNICATION LOG
    │                                    │
    │                              POST  │
    │                          CONTACT ──┘
    │
    └──▶ EMAIL CAMPAIGNS ──▶ Spring Mail ──▶ სტუმრის ელ-ფოსტა


╔══════════════════════════════════════════════════════════════════════╗
║                    AI + CHAT ნაკადი                                 ║
╚══════════════════════════════════════════════════════════════════════╝

  USER/STAFF ──▶ /ai-assistant ──▶ POST /api/ai/chat
                                         │
                                         ▼
                               Anthropic Claude API
                                    (WebClient)
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                           RESPONSE           FALLBACK DEMO
                        (real answer)       (if no API key)
                              │
                              ▼
                        AiMessage saved
                        (session history)


  ADMIN ──▶ UsersListWithChat ──▶ POST /api/chat/start
                                        │
                                   conversation UUID
                                  (deterministic hash)
                                        │
                                        ▼
                             WebSocket STOMP
                          /app/chat/{conversationId}
                                        │
                               broadcast to all
                          /topic/chat/{conversationId}
                                        │
                                  ChatWidget shows
                                  real-time messages
```

═══════════════════════════════════════════════════════════════════════════

## 6. Frontend გვერდების სრული სია

```
┌─────────────────────────────────────────────────────────────────┐
│                    48 გვერდი / Route                             │
├──────────────────┬──────────────────────────────────────────────┤
│ ROUTE            │ BACKEND CALL                    ROLES        │
├──────────────────┼──────────────────────────────────────────────┤
│ /login           │ POST /api/auth/login            PUBLIC       │
│ /register        │ POST /api/auth/register         PUBLIC       │
│ /book            │ GET  public/available-rooms     PUBLIC       │
│ /book/checkout   │ POST public/bookings/direct     PUBLIC       │
│ /guest-functions │ GET  public/my-bookings         PUBLIC       │
│ /guest-checkin   │ POST public/online-checkin      PUBLIC       │
├──────────────────┼──────────────────────────────────────────────┤
│ /room-types      │ GET  /api/room-types            ALL          │
│ /add-room-type   │ POST /api/room-types            ADMIN        │
│ /room-types/edit │ PUT  /api/room-types/{id}       ADMIN        │
│ /rooms/available │ GET  /api/rooms/available       ALL          │
│ /rooms/{id}      │ GET  /api/rooms/{id}            ALL          │
│ /profile         │ GET  /api/user/me               ALL          │
│ /ai-assistant    │ POST /api/ai/chat               ALL          │
│ /notifications   │ GET  /api/notifications         ALL          │
│ /feedback        │ GET  /api/feedback-reviews      ALL          │
│ /add-feedback    │ POST /api/feedback-reviews      ALL          │
│ /services        │ GET  /api/services              ALL          │
├──────────────────┼──────────────────────────────────────────────┤
│ /bookings        │ GET  /api/bookings              REC+ADM      │
│ /add-bookings    │ POST /api/bookings              REC+ADM      │
│ /guests          │ GET  /api/guests                REC+ADM      │
│ /add-guest       │ POST /api/guests                REC+ADM      │
│ /guests/{id}     │ GET  /api/guests/{id}           REC+ADM      │
│ /payments        │ GET  /api/payments              REC+ADM      │
│ /add-payment     │ POST /api/payments              REC+ADM      │
│ /checkins        │ GET  /api/checkins              REC+ADM      │
│ /housekeeping    │ GET  /api/housekeeping          REC+ADM      │
│ /housekeeping/add│ POST /api/housekeeping          REC+ADM      │
│ /maintenance     │ GET  /api/maintenance           REC+ADM      │
│ /maintenance/add │ POST /api/maintenance           REC+ADM      │
│ /service-requests│ GET  /api/servicerequests       REC+ADM      │
│ /add-svc-request │ POST /api/servicerequests       REC+ADM      │
│ /loyalty         │ GET  /api/loyalty               REC+ADM      │
│ /crm             │ GET  /api/guests + crm/**       REC+ADM      │
│ /pos             │ GET  /api/pos                   REC+ADM      │
│ /channel-manager │ GET  /api/channels/**           REC+ADM      │
│ /rate-plans      │ GET  /api/rate-plans            REC+ADM      │
│ /room-calendar   │ GET  /api/rooms/availability    REC+ADM      │
│ /dashboard       │ GET  /api/admin/stats           REC+ADM      │
│ /search-filter   │ GET  /api/bookings + guests     REC+ADM      │
├──────────────────┼──────────────────────────────────────────────┤
│ /hotel           │ GET  /api/hotels                ADMIN        │
│ /add-hotel       │ POST /api/hotels/save           ADMIN        │
│ /rooms           │ GET  /api/rooms                 ADMIN        │
│ /add-room        │ POST /api/rooms/save            ADMIN        │
│ /employees       │ GET  /api/staff                 ADMIN        │
│ /add-employees   │ POST /api/staff                 ADMIN        │
│ /invoices        │ GET  /api/invoices              ADMIN        │
│ /pricing-rules   │ GET  /api/pricing-rules         ADMIN        │
│ /add-pricing-rule│ POST /api/pricing-rules         ADMIN        │
│ /campaigns       │ GET  /api/crm/campaigns         ADMIN        │
│ /campaigns/add   │ POST /api/crm/campaigns         ADMIN        │
│ /kpi             │ GET  /api/admin/kpi             ADMIN        │
│ /reports         │ GET  /api/admin/stats + more    ADMIN        │
│ /add-service     │ POST /api/services              ADMIN        │
│ /rate-plans/add  │ POST /api/rate-plans            ADMIN        │
│ /image-upload    │ POST /api/upload                ADMIN        │
└──────────────────┴──────────────────────────────────────────────┘
```

═══════════════════════════════════════════════════════════════════════════

## 7. Security Filter Chain — JWT ნაკადი

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  CorsFilter  (ყველა origin, ყველა method)          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  JwtAuthenticationFilter                            │
│                                                     │
│  Authorization: Bearer <token>                      │
│         │                                           │
│    ┌────┴─────┐                                     │
│    │ decode   │                                     │
│    │ validate │                                     │
│    │ expiry   │                                     │
│    └────┬─────┘                                     │
│         │                                           │
│  SecurityContext.setAuthentication(...)             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  AuthorizationFilter                                │
│                                                     │
│  /api/auth/**  ──────────────────────▶  PERMIT ALL │
│  /api/public/**  ────────────────────▶  PERMIT ALL │
│  /api/checkins (GET/PATCH) ──────────▶  REC + ADM  │
│  /api/bookings (POST) ───────────────▶  REC + ADM  │
│  /api/guests (POST) ─────────────────▶  REC + ADM  │
│  /api/housekeeping (POST/PUT/PATCH) ─▶  REC + ADM  │
│  /api/pricing-rules/** ──────────────▶  ADMIN      │
│  /api/admin/** ──────────────────────▶  ADMIN      │
│  POST/PUT/PATCH/DELETE /api/** ──────▶  ADMIN      │
│  GET /api/** ────────────────────────▶  ALL AUTH   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              Controller → Service
              → Repository → DB
```

═══════════════════════════════════════════════════════════════════════════

## 8. Real-Time: WebSocket STOMP

```
Frontend (ChatWidget.tsx)
        │
        │  SockJS connection
        ▼
ws://localhost:8080/ws
        │
        │  STOMP protocol
        ▼
┌───────────────────────────────────┐
│  WebSocketConfig                  │
│  endpoint: /ws                    │
│  broker:   /topic                 │
│  prefix:   /app                   │
└──────────────┬────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
/app/chat/{id}    /topic/chat/{id}
  (send)            (subscribe)
    │                     ▲
    │                     │
    ▼                     │
ChatWsController   broadcast
  save message ────────────┘
  to DB
```

═══════════════════════════════════════════════════════════════════════════

## 9. ფაილების სტრუქტურა

```
HotelBooking/
├── beckend/hotel/
│   └── src/main/java/com/booksys/
│       ├── user/          → AppUser, SecurityConfig, JwtFilter
│       ├── hotel/         → Hotel, HotelController, HotelService
│       ├── room/          → Room, RoomController, RoomService
│       ├── roomtype/      → RoomType, RoomTypeController
│       ├── booking/       → Booking, BookingController, BookingService
│       ├── guest/         → Guest, GuestController, GuestService
│       ├── payment/       → Payment, PaymentController, PaymentMapper
│       ├── invoice/       → Invoice, InvoiceController, InvoiceMapper
│       ├── service/       → ServiceEntity, ServiceController
│       ├── servicerequest/→ ServiceRequest, ServiceRequestController
│       ├── feedbackreview/→ FeedbackReview, FeedbackReviewMapper
│       ├── housekeeping/  → HousekeepingTask, HousekeepingController
│       ├── maintenance/   → MaintenanceRequest, MaintenanceController
│       ├── loyalty/       → GuestLoyalty, LoyaltyController
│       ├── rateplan/      → RatePlan, RatePlanController
│       ├── pricingRule/   → PricingRule, PricingRuleController
│       ├── checkin/       → OnlineCheckIn, CheckInController
│       ├── crm/           → GuestCommunication, EmailCampaign, CrmController
│       ├── pos/           → RoomCharge, PosController
│       ├── channel/       → ChannelListing, ChannelReservation, ChannelController
│       ├── employee/      → Staff, StaffController, StaffMapper
│       ├── ai/            → AiMessage, AiController (Claude API)
│       ├── chat/          → ChatMessage, ChatWsController, ChatRestController
│       ├── notification/  → Notification, NotificationController
│       ├── invoice/       → Invoice, InvoiceService (PDF gen)
│       ├── upload/        → UploadController
│       └── admin/         → AdminStatsController
│
└── frontend/HotelBooking/src/
    ├── app/               → 48 გვერდი (Next.js App Router)
    │   ├── login/         ├── bookings/      ├── checkins/
    │   ├── register/      ├── add-bookings/  ├── housekeeping/
    │   ├── dashboard/     ├── guests/        ├── maintenance/
    │   ├── hotel/         ├── add-guest/     ├── loyalty/
    │   ├── rooms/         ├── payments/      ├── crm/
    │   ├── room-types/    ├── invoices/      ├── campaigns/
    │   ├── book/          ├── services/      ├── pos/
    │   ├── guest-functions├── rate-plans/    ├── channel-manager/
    │   ├── guest-checkin/ ├── pricing-rules/ ├── ai-assistant/
    │   ├── profile/       ├── employees/     ├── reports/
    │   └── kpi/           └── notifications/ └── feedback/
    │
    ├── components/
    │   ├── lib/axiosConfig.tsx  → JWT interceptor, refresh logic
    │   ├── layout/Sidebar.tsx   → Role-based navigation (48 links)
    │   ├── forms/               → 15+ Add* forms
    │   ├── tables/              → 15+ List* tables
    │   └── chat/                → ChatWidget, UsersListWithChat
    │
    ├── context/
    │   └── SidebarContext.tsx   → mobile sidebar state
    │
    └── utils/
        ├── auth.ts             → API_BASE, saveToken, authFetch
        └── api.ts              → API_BASE (env-var)
```

═══════════════════════════════════════════════════════════════════════════

## 10. სისტემის KPI — ციფრები

```
┌─────────────────────────────────────────────────────────┐
│                  პროექტის მასშტაბი                      │
├─────────────────────────────────────────┬───────────────┤
│  Backend Java ფაილები                   │     120+      │
│  Frontend TSX ფაილები                   │     125+      │
│  REST Endpoints                         │     152        │
│  WebSocket endpoints                    │      2         │
│  Database Tables                        │      26        │
│  Frontend Routes                        │      48        │
│  User Roles                             │      3         │
│  Domains / Modules                      │      24        │
│  External API Integrations              │      3         │
│  (Claude AI, Stripe, Spring Mail)       │               │
└─────────────────────────────────────────┴───────────────┘
```
