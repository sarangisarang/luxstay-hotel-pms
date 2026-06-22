# HotelBooking — Vollständige Systemarchitektur

## Technologie-Stack

| Schicht | Technologie |
|---------|-------------|
| Backend | Spring Boot 3.2.5 · Java 17 · Spring Security (JWT) |
| Datenbank | PostgreSQL · JPA/Hibernate (DDL auto-update) |
| Frontend | Next.js 15 (App Router) · TypeScript · Axios |
| Auth | JWT · Rollen: ADMIN / RECEPTION / USER |
| Real-Time | WebSocket (STOMP) |
| AI | Anthropic Claude API (fallback: Demo-Modus) |

---

## Datenfluss-Prinzip

```
Browser → Axios (axiosConfig.tsx)
        → baseURL: NEXT_PUBLIC_API_BASE (env-var) oder http://localhost:8080
        → JWT Bearer Token (automatisch über Request-Interceptor)
        → Spring Security Filter Chain (JWT validieren → Rolle prüfen)
        → Controller → Service → Repository → PostgreSQL
        → JSON Response → Frontend State → UI
```

---

## Modul-Übersicht: 20 Domänen vollständig verbunden

---

### 1. AUTH / USER
```
Entity:      AppUser  (id, email, password, role, guest↔, staff↔)
Controller:  /api/auth/**  (public)
             /api/user/me, /api/user/change-password  (alle Rollen)
             /api/admin/**  (ADMIN)
Frontend:    /login  → POST /api/auth/login  → JWT speichern
             /register  → POST /api/auth/register  → JWT speichern
             /profile  → GET /api/user/me  |  POST /api/user/change-password
             /dashboard  → GET /api/admin/stats, monthly-revenue, booking-status-summary
             /kpi  → GET /api/admin/kpi, /api/admin/forecast
             /reports  → GET /api/admin/stats, monthly-revenue, booking-status-summary
Rollen:      Login/Register: public | Profil: alle | Admin-Stats: ADMIN
```

---

### 2. HOTEL
```
Entity:      Hotel  (id, name, address, phone, email, description, rating,
                     imageId, imageName, latitude, longitude)
DTO:         HotelDTO  (alle Felder 1:1)
Controller:  GET    /api/hotels
             POST   /api/hotels/save
             PUT    /api/hotels/{id}
             DELETE /api/hotels/{id}
             POST   /api/hotels/upload  (Bild-Upload)
Frontend:    /hotel  → GET /api/hotels
             /add-hotel  → POST /api/hotels/save
Upload:      POST /api/hotels/upload  →  Response: { url }
Rollen:      GET: alle auth. | Schreiben: ADMIN
```

---

### 3. ROOM TYPE
```
Entity:      RoomType  (id, name, description, pricePerNight, capacity,
                        imageUrl, 40+ boolean Ausstattungs-Felder)
DTO:         RoomTypeDTO  (identisch zur Entity)
Controller:  GET    /api/room-types
             GET    /api/room-types/{id}
             POST   /api/room-types
             PUT    /api/room-types/{id}
             DELETE /api/room-types/{id}
             POST   /api/room-types/{id}/upload-image
             GET    /api/room-types/{id}/price-estimate
Frontend:    /room-types  → GET /api/room-types
             /add-room-type  → POST /api/room-types
             /room-types/edit/{id}  → GET + PUT /api/room-types/{id}
             Preis-Schätzung: GET /api/room-types/{id}/price-estimate?nights=N
Rollen:      GET: alle auth. | Schreiben: ADMIN
```

---

### 4. ROOM
```
Entity:      Room  (id, roomNumber, floor, price, description, roomStatus,
                    imageUrl, hotelName, hotel↔Hotel, roomType↔RoomType)
DTO:         RoomDTO  (id, roomNumber, floor, roomTypeId, price, hotelId,
                       roomStatus, description, imageUrl, hotelName, roomType)
Controller:  GET    /api/rooms
             POST   /api/rooms/save
             GET    /api/rooms/{id}
             PUT    /api/rooms/{id}
             DELETE /api/rooms/{id}
             GET    /api/rooms/available
             GET    /api/rooms/availability
             POST   /api/rooms/{roomId}/upload-image  →  app.server.url/uploads/{file}
Frontend:    /rooms  → GET /api/rooms
             /add-room  → POST /api/rooms/save
             /rooms/{id}  → GET /api/rooms/{id}
             /rooms/edit/{id}  → GET + PUT /api/rooms/{id}
             /rooms/available  → GET /api/rooms/available
             /room-calendar  → GET /api/rooms/availability
Rollen:      GET: alle auth. | Schreiben: ADMIN
```

---

### 5. GUEST
```
Entity:      Guest  (id, firstName, lastName, email, phone, address, birthDate,
                     bookings[], serviceRequests[], feedbackReviews[], appUser↔)
DTO:         GuestDTO  (id, firstName, lastName, email, phone, address, birthDate)
Controller:  GET    /api/guests
             POST   /api/guests
             GET    /api/guests/{id}
             PUT    /api/guests/{id}
             DELETE /api/guests/{id}
Frontend:    /guests  → GET /api/guests
             /add-guest  → POST /api/guests
             /guests/{id}  → GET + PUT + DELETE /api/guests/{id}
Rollen:      GET: alle auth. | POST/PUT: ADMIN + RECEPTION | DELETE: ADMIN
```

---

### 6. BOOKING
```
Entity:      Booking  (id, roomNumber, guestName, totalAmount, totalServiceAmount,
                       checkInDate, checkOutDate, paymentStatus, bookingStatus,
                       room↔Room, guest↔Guest, payment↔Payment, services[])
DTO:         BookingDTO  (id, guestId, guestName, roomId, roomNumber, totalAmount,
                          paymentStatus, serviceIds[], totalServiceAmount,
                          bookingStatus, services[], checkInDate, checkOutDate)
Controller:  GET    /api/bookings
             POST   /api/bookings
             GET    /api/bookings/{id}
             PUT    /api/bookings/{id}
             DELETE /api/bookings/{id}
             PUT    /api/bookings/{id}/checkin
             PUT    /api/bookings/{id}/checkout
             PUT    /api/bookings/{id}/cancel
             POST   /api/bookings/calculate  (Preis-Kalkulation)
             GET    /api/bookings/check-availability
Public:      GET    /api/public/bookings/available-rooms
             GET    /api/public/bookings/my-bookings?email=
             POST   /api/public/bookings/direct  (Gast bucht ohne Login)
             POST   /api/public/bookings/{id}/cancel?email=
Frontend:    /bookings  → GET /api/bookings
             /add-bookings  → POST /api/bookings
             /book  → GET /api/public/bookings/available-rooms  (ohne Auth)
             /book/checkout  → POST /api/public/bookings/direct  (ohne Auth)
             /guest-functions  → GET /api/public/bookings/my-bookings  (ohne Auth)
             Check-In/Out/Cancel: PUT /api/bookings/{id}/checkin|checkout|cancel
Rollen:      GET: alle auth. | POST/PUT: ADMIN + RECEPTION | Public: offen
```

---

### 7. PAYMENT
```
Entity:      Payment  (id, cardNumber, expiry, cvv, guestId, guestName,
                       guestEmail, guestAddress, amount, paymentMethod,
                       paymentDate: LocalDateTime, status, booking↔Booking)
RequestDTO:  PaymentRequestDTO  (bookingId, amount, paymentMethod,
                                  paymentDate: LocalDate ← Mapper: atStartOfDay())
ResponseDTO: PaymentResponseDTO  (id, bookingId, amount, paymentMethod,
                                   paymentDate: LocalDate ← Mapper: toLocalDate(),
                                   status, cardNumber, expiry, cvv,
                                   guestId, guestName, guestEmail, guestAddress)
Controller:  GET    /api/payments
             POST   /api/payments
             GET    /api/payments/{id}
             DELETE /api/payments/{id}
             GET    /api/payments/booking/{bookingId}
Frontend:    /payments  → GET /api/payments
             /add-payment  → POST /api/payments
             /invoices  → GET /api/payments/booking/{bookingId}
Rollen:      GET: alle auth. | POST: ADMIN + RECEPTION | DELETE: ADMIN
```

---

### 8. INVOICE
```
Entity:      Invoice  (id, invoiceNumber, booking↔Booking, amount,
                       issuedDate, status: GENERATED|PAID|UNPAID|CANCELLED, pdfUrl)
DTO:         InvoiceDTO  (id, bookingId, invoiceNumber, amount,
                          issuedDate, status, pdfUrl)  ← invoiceNumber jetzt dabei
Controller:  GET    /api/invoices
             POST   /api/invoices/{bookingId}  (generieren)
             GET    /api/invoices/{id}
             GET    /api/invoices/{id}/pdf
             GET    /api/invoices/booking/{bookingId}
             GET    /api/invoices/number/{invoiceNumber}
             PUT    /api/invoices/{id}
             PUT    /api/invoices/{id}/paid
             PUT    /api/invoices/{id}/unpaid
             PUT    /api/invoices/{id}/cancelled
             DELETE /api/invoices/{id}
Frontend:    /invoices  → GET /api/invoices
             PDF-Download: GET /api/invoices/{id}/pdf
             Status-Änderung: PUT /api/invoices/{id}/paid|unpaid|cancelled
Rollen:      GET: alle auth. | Schreiben: ADMIN | PDF: ADMIN
```

---

### 9. SERVICE
```
Entity:      ServiceEntity  (id, name, description, price, serviceRequests[])
DTO:         ServiceDTO  (id, name, description, price)
Controller:  GET    /api/services
             POST   /api/services
             GET    /api/services/{id}
             PUT    /api/services/{id}
             DELETE /api/services/{id}
Frontend:    /services  → GET /api/services
             /add-service  → POST /api/services
Rollen:      GET: alle auth. | Schreiben: ADMIN
```

---

### 10. SERVICE REQUEST
```
Entity:      ServiceRequest  (id, description, requestDate, status,
                               guest↔Guest, service↔ServiceEntity, booking↔Booking)
DTO:         ServiceRequestDTO  (id, guestId, serviceId, status, description, requestDate)
Controller:  GET    /api/servicerequests
             POST   /api/servicerequests
             GET    /api/servicerequests/{id}
             PUT    /api/servicerequests/{id}
             DELETE /api/servicerequests/{id}
Frontend:    /service-requests  → GET /api/servicerequests
             /add-service-request  → POST /api/servicerequests
             /edit-service-request/{id}  → GET + PUT /api/servicerequests/{id}
Rollen:      GET: alle auth. | POST/PUT: ADMIN + RECEPTION | DELETE: ADMIN
```

---

### 11. FEEDBACK / REVIEW
```
Entity:      FeedbackReview  (id, feedbackText, rating, comment,
                               createdAt, guest↔Guest, hotel↔Hotel, services[])
DTO:         FeedbackReviewDTO  (id, serviceIds[], guestId, hotelId, hotelName,
                                  feedbackText, rating, comment, createdAt)
Controller:  GET    /api/feedback-reviews
             POST   /api/feedback-reviews
             GET    /api/feedback-reviews/{id}
             PUT    /api/feedback-reviews/{id}
             DELETE /api/feedback-reviews/{id}
Frontend:    /feedback  → GET /api/feedback-reviews
             /add-feedback-review  → POST /api/feedback-reviews
                                      (Felder: guestId, feedbackText, comment, rating)
Rollen:      GET: alle auth. | POST: alle auth. | DELETE: ADMIN
```

---

### 12. HOUSEKEEPING
```
Entity:      HousekeepingTask  (id, roomNumber, roomId, status, type,
                                 priority, assignedTo, notes, scheduledAt,
                                 completedAt, createdAt, updatedAt)
Controller:  GET    /api/housekeeping
             POST   /api/housekeeping
             GET    /api/housekeeping/{id}
             PUT    /api/housekeeping/{id}
             PATCH  /api/housekeeping/{id}/status
             PATCH  /api/housekeeping/{id}/assign
             DELETE /api/housekeeping/{id}
             GET    /api/housekeeping/active
             GET    /api/housekeeping/status/{status}
             GET    /api/housekeeping/assigned/{staff}
Frontend:    /housekeeping  → GET + POST + PATCH + DELETE /api/housekeeping/**
             /housekeeping/add  → POST /api/housekeeping
Rollen:      GET: alle auth. | POST/PUT/PATCH: ADMIN + RECEPTION | DELETE: ADMIN
```

---

### 13. MAINTENANCE
```
Entity:      MaintenanceRequest  (id, roomNumber, roomId, title, description,
                                   status, priority, category, reportedBy,
                                   assignedTo, resolutionNotes, reportedAt,
                                   resolvedAt, createdAt, updatedAt)
Controller:  GET    /api/maintenance
             POST   /api/maintenance
             GET    /api/maintenance/{id}
             PUT    /api/maintenance/{id}
             PATCH  /api/maintenance/{id}/status
             PATCH  /api/maintenance/{id}/assign
             DELETE /api/maintenance/{id}
             GET    /api/maintenance/open
             GET    /api/maintenance/status/{status}
             GET    /api/maintenance/priority/{priority}
             GET    /api/maintenance/stats
Frontend:    /maintenance  → GET + POST + PATCH + DELETE /api/maintenance/**
             /maintenance/add  → POST /api/maintenance
Rollen:      GET: alle auth. | POST/PUT/PATCH: ADMIN + RECEPTION | DELETE: ADMIN
```

---

### 14. RATE PLANS
```
Entity:      RatePlan  (id, name, description, type, discountPercent,
                         minNights, validFrom, validTo, active, createdAt, updatedAt)
Controller:  GET    /api/rate-plans
             POST   /api/rate-plans
             GET    /api/rate-plans/{id}
             PUT    /api/rate-plans/{id}
             PATCH  /api/rate-plans/{id}/toggle
             DELETE /api/rate-plans/{id}
             GET    /api/rate-plans/active
             GET    /api/rate-plans/applicable
Frontend:    /rate-plans  → GET + POST + PATCH + DELETE /api/rate-plans/**
             /rate-plans/add  → POST /api/rate-plans
Rollen:      GET: alle auth. | Schreiben: ADMIN + RECEPTION
```

---

### 15. LOYALTY PROGRAM
```
Entity:      GuestLoyalty  (id, guestId unique, guestEmail, guestName,
                             points, tier: BRONZE|SILVER|GOLD|PLATINUM,
                             totalStays, totalSpent, updatedAt)
Controller:  GET    /api/loyalty
             POST   /api/loyalty/award
             PATCH  /api/loyalty/{id}/redeem
             GET    /api/loyalty/stats
             GET    /api/loyalty/tier/{tier}
             GET    /api/loyalty/guest/{guestId}
             GET    /api/loyalty/email/{email}
Frontend:    /loyalty  → GET /api/loyalty
                          POST /api/loyalty/award
                          PATCH /api/loyalty/{id}/redeem
                          GET /api/loyalty/stats
Rollen:      GET: alle auth. | Schreiben: ADMIN + RECEPTION
```

---

### 16. CRM + CAMPAIGNS
```
Entities:    GuestCommunication  (id, guestId, communicationType,
                                   contactedAt, notes, response)
             EmailCampaign  (id, name, subject, bodyHtml, targetSegment,
                              status: DRAFT|SENT|SCHEDULED, sentAt)
Controller:  GET    /api/crm/guests/{guestId}/profile  (360°-Profil)
             GET    /api/crm/communications
             POST   /api/crm/communications
             DELETE /api/crm/communications/{id}
             GET    /api/crm/communications/guest/{guestId}
             GET    /api/crm/campaigns
             POST   /api/crm/campaigns
             PUT    /api/crm/campaigns/{id}
             POST   /api/crm/campaigns/{id}/send
             DELETE /api/crm/campaigns/{id}
             GET    /api/crm/segments
Frontend:    /crm  → GET /api/guests + /api/crm/segments
                      GET /api/crm/guests/{id}/profile
                      POST /api/crm/communications
             /campaigns  → GET /api/crm/campaigns
                            POST /api/crm/campaigns/{id}/send
             /campaigns/add  → POST /api/crm/campaigns
Rollen:      ADMIN + RECEPTION
```

---

### 17. POS / ROOM CHARGES
```
Entity:      RoomCharge  (id, bookingId, roomNumber, description,
                           amount, quantity, category, status, chargedAt)
Controller:  GET    /api/pos
             POST   /api/pos
             GET    /api/pos/stats
             PATCH  /api/pos/{id}/void
             PATCH  /api/pos/{id}/status
             DELETE /api/pos/{id}
             GET    /api/pos/booking/{bookingId}
             GET    /api/pos/room/{roomNumber}
             GET    /api/pos/booking/{bookingId}/total
Frontend:    /pos  → GET /api/pos + /api/pos/stats
                     POST /api/pos
                     PATCH /api/pos/{id}/void
Rollen:      ADMIN + RECEPTION
```

---

### 18. CHANNEL MANAGER
```
Entities:    ChannelListing  (id, roomTypeId, roomTypeName, channel,
                               status, externalListingId, channelRate,
                               commissionPct, minNights, maxNights,
                               instantBook, lastSyncAt)
             ChannelReservation  (id, channel, externalId, roomTypeId,
                                   guestName, guestEmail, checkIn, checkOut,
                                   totalAmount, status, receivedAt)
Controller:  GET    /api/channels/listings
             POST   /api/channels/listings
             PUT    /api/channels/listings/{id}
             POST   /api/channels/listings/{id}/sync
             DELETE /api/channels/listings/{id}
             GET    /api/channels/reservations
             POST   /api/channels/reservations
             PATCH  /api/channels/reservations/{id}/confirm
             PATCH  /api/channels/reservations/{id}/cancel
             GET    /api/channels/stats
Frontend:    /channel-manager  → GET /api/channels/listings + reservations + stats
                                  POST /api/channels/listings/{id}/sync
                                  PATCH /api/channels/reservations/{id}/confirm|cancel
Rollen:      ADMIN + RECEPTION
```

---

### 19. DYNAMIC PRICING
```
Entity:      PricingRule  (id, name, type, description, active, priority,
                            adjustmentPercent, adjustmentFixed,
                            validFrom, validTo, conditionMinNights,
                            conditionDaysBeforeArrival,
                            conditionOccupancyPctMin, conditionOccupancyPctMax)
Controller:  GET    /api/pricing-rules
             POST   /api/pricing-rules
             PUT    /api/pricing-rules/{id}
             PATCH  /api/pricing-rules/{id}/toggle
             DELETE /api/pricing-rules/{id}
             GET    /api/pricing-rules/active
             GET    /api/pricing-rules/simulate?basePrice=&nights=&checkIn=
Frontend:    /pricing-rules  → GET /api/pricing-rules
                                PATCH /api/pricing-rules/{id}/toggle
                                GET /api/pricing-rules/simulate (Rate Simulator)
             /pricing-rules/add  → POST /api/pricing-rules
Rollen:      ADMIN
```

---

### 20. ONLINE CHECK-IN
```
Entity:      OnlineCheckIn  (id, bookingId, guestEmail, guestFirstName,
                              guestLastName, passportNumber, nationality,
                              dateOfBirth, address, estimatedArrivalTime,
                              specialRequests, earlyCheckIn, lateCheckOut,
                              extraBed, airportTransfer, status, confirmationCode,
                              submittedAt, processedAt)
Controller:  POST   /api/public/online-checkin  (kein Auth)
             GET    /api/public/online-checkin/status?email=  (kein Auth)
             GET    /api/checkins  (Staff)
             GET    /api/checkins/stats  (Staff)
             GET    /api/checkins/pending  (Staff)
             PATCH  /api/checkins/{id}/approve  (Staff)
             PATCH  /api/checkins/{id}/reject  (Staff)
Frontend:    /guest-checkin  → POST /api/public/online-checkin  (öffentlich)
                               GET /api/public/online-checkin/status
             /checkins  → GET /api/checkins + /api/checkins/stats
                           PATCH /api/checkins/{id}/approve|reject
Rollen:      Public-Endpoints: ohne Auth | Staff-Endpoints: ADMIN + RECEPTION
```

---

### 21. AI ASSISTANT (LuxBot)
```
Entity:      AiMessage  (id, sessionId, role, content, userEmail, createdAt)
Controller:  POST   /api/ai/chat  (Nachricht senden, Antwort erhalten)
             GET    /api/ai/history/{sessionId}  (Verlauf laden)
             DELETE /api/ai/history/{sessionId}  (Verlauf löschen)
Integration: WebClient → Anthropic Claude API
             Fallback: Demo-Antworten wenn CLAUDE_API_KEY nicht gesetzt
Frontend:    /ai-assistant  → POST /api/ai/chat
                               GET /api/ai/history/{sessionId}
Rollen:      ADMIN + RECEPTION + USER
```

---

### 22. CHAT (WebSocket)
```
Entity:      ChatMessage  (id, bookingId, senderId, receiverId, content, sentAt)
WebSocket:   /app/chat/{bookingId}  → broadcast → /topic/chat/{bookingId}
REST:        GET    /api/chat/{bookingId}/messages  (Verlauf)
             POST   /api/chat/start  (Konversation starten, gibt stabile UUID zurück)
             POST   /api/chat/support/start/{userId}  (Fallback)
Frontend:    ChatWidget  → WebSocket + GET /api/chat/{id}/messages
             UsersListWithChat  → POST /api/chat/start
Rollen:      ADMIN + RECEPTION + USER
```

---

### 23. EMPLOYEE / STAFF
```
Entity:      Staff  (id, firstName, lastName, positions, salary,
                     dateOfBirth, phone, email, hireDate, hotel↔Hotel, hotelName)
DTO:         StaffDTO  (id, hotelId, firstName, lastName, positions,
                         salary, dateOfBirth, phone, email, hireDate, hotelName)
Controller:  GET    /api/staff
             POST   /api/staff
             GET    /api/staff/{id}
             PUT    /api/staff/{id}
             DELETE /api/staff/{id}
Frontend:    /employees  → GET /api/staff
             /add-employees  → POST /api/staff
Rollen:      GET: alle auth. | Schreiben: ADMIN
```

---

### 24. NOTIFICATIONS
```
Entity:      Notification  (id, userId, message, type, read, createdAt)
Controller:  GET    /api/notifications
             PATCH  /api/notifications/{id}/read
             DELETE /api/notifications/{id}
Frontend:    /notifications  → GET /api/notifications
                                PATCH /api/notifications/{id}/read
Rollen:      alle auth.
```

---

## Berechtigungs-Matrix

| Endpoint-Gruppe | USER | RECEPTION | ADMIN |
|-----------------|------|-----------|-------|
| Login / Register | ✅ | ✅ | ✅ |
| GET alle Listen | ✅ | ✅ | ✅ |
| Booking erstellen | ❌ | ✅ | ✅ |
| Guest erstellen | ❌ | ✅ | ✅ |
| Payment erstellen | ❌ | ✅ | ✅ |
| Housekeeping schreiben | ❌ | ✅ | ✅ |
| Maintenance schreiben | ❌ | ✅ | ✅ |
| Check-In genehmigen | ❌ | ✅ | ✅ |
| CRM / Kampagnen | ❌ | ✅ | ✅ |
| POS / Zimmergebühren | ❌ | ✅ | ✅ |
| Channel Manager | ❌ | ✅ | ✅ |
| Mitarbeiter verwalten | ❌ | ❌ | ✅ |
| Zimmer/Hotel erstellen | ❌ | ❌ | ✅ |
| Preisregeln | ❌ | ❌ | ✅ |
| Rechnungen | ❌ | ❌ | ✅ |
| Löschen (alle) | ❌ | ❌ | ✅ |
| AI Assistant | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ |
| Public Check-In | ✅ (kein Login) | - | - |
| Eigene Buchungen | ✅ (kein Login) | - | - |

---

## Fixierte Mismatches (diese Session)

| # | Problem | Fix |
|---|---------|-----|
| 1 | `StaffDTO.staffID` ≠ Standard | Umbenannt zu `id` in DTO + Mapper + Frontend |
| 2 | `FeedbackReviewDTO` fehlte `comment` | `comment` zu DTO, Mapper und Frontend-Formular hinzugefügt |
| 3 | `InvoiceDTO` fehlte `invoiceNumber` | `invoiceNumber` zu DTO und Mapper hinzugefügt |
| 4 | Hardcoded `http://localhost:8080` (7 Stellen) | Ersetzt durch `NEXT_PUBLIC_API_BASE` env-var |
| 5 | `POST /api/chat/start` fehlte | Endpoint mit deterministischer UUID erstellt |
| 6 | `@CrossOrigin` inkonsistent auf 10 Controllern | Entfernt — SecurityConfig verwaltet CORS zentral |
| 7 | `utils/api.ts` falscher Env-Var-Name | `NEXT_PUBLIC_API_URL` → `NEXT_PUBLIC_API_BASE` |
| 8 | `RoomController` inner class duplikat | Bereinigt zu einer einzigen Klasse |
| 9 | Upload-URLs hardcoded | `app.server.url` Property in application.properties |

---

## Umgebungsvariablen

```bash
# Backend
DB_URL=jdbc:postgresql://host:5432/booking
DB_USER=booking_user
DB_PASS=password
JWT_SECRET=...
CLAUDE_API_KEY=...       # optional, AI-Assistent
ANTHROPIC_API_KEY=...    # optional, alternativ
APP_SERVER_URL=https://your-domain.com  # für Upload-URLs
STRIPE_SECRET_KEY=...    # optional
MAIL_USER=...            # optional, E-Mail-Versand

# Frontend (.env.local)
NEXT_PUBLIC_API_BASE=https://your-backend-domain.com
```
