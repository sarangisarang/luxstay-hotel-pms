package com.booksys.guest;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.checkin.OnlineCheckIn;
import com.booksys.checkin.OnlineCheckInRepository;
import com.booksys.crm.GuestCommunicationRepository;
import com.booksys.feedbackreview.FeedbackReviewRepository;
import com.booksys.guest.preference.GuestPreferenceRepository;
import com.booksys.loyalty.GuestLoyaltyRepository;
import com.booksys.payment.Payment;
import com.booksys.payment.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * DSGVO Art. 15 / Art. 20 data export for one guest: everything the system
 * stores about the person (profile, stays, payments, loyalty, preferences,
 * online check-ins, reviews and logged communication). The old export only
 * contained profile, bookings and loyalty.
 *
 * <p>Used by staff ({@code GET /api/guests/{id}/data-export}) and by the guest
 * for their own data ({@code GET /api/user/data-export}).</p>
 */
@Service
@RequiredArgsConstructor
public class GuestDataExportService {

    private final GuestService guestService;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final GuestLoyaltyRepository loyaltyRepository;
    private final GuestPreferenceRepository preferenceRepository;
    private final FeedbackReviewRepository feedbackRepository;
    private final OnlineCheckInRepository checkInRepository;
    private final GuestCommunicationRepository communicationRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> export(UUID guestId) {
        GuestDTO guest = guestService.getGuestById(guestId);
        List<Booking> bookings = bookingRepository.findByGuestIdOrderByCheckInDateDesc(guestId);

        List<Map<String, Object>> bookingData = bookings.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("checkIn", b.getCheckInDate());
            m.put("checkOut", b.getCheckOutDate());
            m.put("status", b.getBookingStatus());
            m.put("paymentStatus", b.getPaymentStatus());
            m.put("totalAmount", b.getTotalAmount());
            m.put("roomNumber", b.getRoomNumber());
            m.put("source", b.getBookingSource());
            m.put("specialRequests", b.getSpecialRequests());
            m.put("voucherCode", b.getVoucherCode());
            m.put("createdAt", b.getCreatedAt());
            m.put("payments", paymentRepository.findByBookingId(b.getId()).stream().map(GuestDataExportService::payment).toList());
            return m;
        }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("exportedAt", LocalDateTime.now().toString());
        result.put("guest", guest);
        result.put("bookings", bookingData);
        result.put("bookingCount", bookings.size());

        loyaltyRepository.findByGuestId(guestId).ifPresent(l -> {
            Map<String, Object> loyalty = new LinkedHashMap<>();
            loyalty.put("points", l.getPoints());
            loyalty.put("tier", l.getTier());
            loyalty.put("totalStays", l.getTotalStays());
            loyalty.put("totalSpent", l.getTotalSpent());
            result.put("loyalty", loyalty);
        });
        preferenceRepository.findByGuestId(guestId).ifPresent(p -> result.put("preferences", p));

        List<UUID> bookingIds = bookings.stream().map(Booking::getId).toList();
        if (!bookingIds.isEmpty()) {
            result.put("onlineCheckIns", checkInRepository.findByBookingIdIn(bookingIds).stream()
                    .map(GuestDataExportService::checkIn).toList());
        }
        result.put("reviews", feedbackRepository.findByGuestId(guestId).stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("rating", r.getRating());
            m.put("feedbackText", r.getFeedbackText());
            m.put("comment", r.getComment());
            m.put("createdAt", r.getCreatedAt());
            return m;
        }).toList());
        result.put("communications", communicationRepository.findByGuestIdOrderByContactedAtDesc(guestId).stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("type", c.getType());
            m.put("subject", c.getSubject());
            m.put("body", c.getBody());
            m.put("contactedAt", c.getContactedAt());
            return m;
        }).toList());
        return result;
    }

    private static Map<String, Object> payment(Payment p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("amount", p.getAmount());
        m.put("method", p.getPaymentMethod());
        m.put("status", p.getStatus());
        m.put("date", p.getPaymentDate());
        m.put("cardLast4", p.getCardLast4());
        return m;
    }

    private static Map<String, Object> checkIn(OnlineCheckIn c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("bookingId", c.getBookingId());
        m.put("status", c.getStatus());
        m.put("firstName", c.getGuestFirstName());
        m.put("lastName", c.getGuestLastName());
        m.put("email", c.getGuestEmail());
        m.put("passportNumber", c.getPassportNumber());
        m.put("nationality", c.getNationality());
        m.put("dateOfBirth", c.getDateOfBirth());
        m.put("address", c.getAddress());
        m.put("submittedAt", c.getSubmittedAt());
        return m;
    }
}
