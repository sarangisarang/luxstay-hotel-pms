package com.booksys.pricing;

import com.booksys.room.Room;
import com.booksys.room.RoomRepository;
import com.booksys.roomtype.RoomType;
import com.booksys.service.ServiceEntity;
import com.booksys.service.ServiceRepository;
import com.booksys.voucher.VoucherEvaluation;
import com.booksys.voucher.VoucherService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Calculates the price of a stay: nightly rates with the dynamic-pricing uplifts,
 * add-on services and an optional voucher. Used by the public quote endpoint,
 * the pay-at-hotel booking and the Stripe checkout.
 */
@Service
@RequiredArgsConstructor
public class BookingQuoteService {

    private static final int SCALE = 2;
    private static final RoundingMode RM = RoundingMode.HALF_UP;

    private final RoomRepository roomRepository;
    private final ServiceRepository serviceRepository;
    private final DynamicPricingService dynamicPricingService;
    private final VoucherService voucherService;

    /**
     * Quotes a stay by IDs (loads the room and services).
     *
     * @throws EntityNotFoundException  when the room does not exist
     * @throws IllegalArgumentException when dates or the voucher are invalid
     */
    public BookingQuote quote(UUID roomId, LocalDate checkIn, LocalDate checkOut,
                              List<UUID> serviceIds, String voucherCode) {
        if (roomId == null) throw new IllegalArgumentException("Room is required");
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));
        List<ServiceEntity> services = loadServices(serviceIds);
        return quote(room, checkIn, checkOut, services, voucherCode);
    }

    /**
     * Quotes a stay for an already loaded room and services.
     *
     * @param voucherCode optional; an invalid code raises {@link IllegalArgumentException}
     *                    with the reason, so the guest learns why it was not applied
     */
    public BookingQuote quote(Room room, LocalDate checkIn, LocalDate checkOut,
                              List<ServiceEntity> services, String voucherCode) {
        if (checkIn == null || checkOut == null) {
            throw new IllegalArgumentException("Check-in and check-out are required");
        }
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights <= 0) {
            throw new IllegalArgumentException("Check-out must be after check-in");
        }
        RoomType roomType = room.getRoomType();
        if (roomType == null || roomType.getPricePerNight() == null) {
            throw new IllegalStateException("Room has no room type or price");
        }

        // Nightly prices with the same uplifts the reception uses
        BigDecimal base = roomType.getPricePerNight().setScale(SCALE, RM);
        List<BookingQuote.NightPrice> nightly = new ArrayList<>();
        BigDecimal roomTotal = BigDecimal.ZERO.setScale(SCALE, RM);
        for (LocalDate night = checkIn; night.isBefore(checkOut); night = night.plusDays(1)) {
            BigDecimal price = dynamicPricingService.nightlyPrice(base, night);
            nightly.add(new BookingQuote.NightPrice(night, price));
            roomTotal = roomTotal.add(price);
        }

        List<BookingQuote.ServiceLine> serviceLines = new ArrayList<>();
        BigDecimal servicesTotal = BigDecimal.ZERO.setScale(SCALE, RM);
        for (ServiceEntity s : services == null ? List.<ServiceEntity>of() : services) {
            BigDecimal price = s.getPrice() == null ? BigDecimal.ZERO : s.getPrice().setScale(SCALE, RM);
            serviceLines.add(new BookingQuote.ServiceLine(s.getId(), s.getName(), price));
            servicesTotal = servicesTotal.add(price);
        }

        BigDecimal subtotal = roomTotal.add(servicesTotal);
        String appliedCode = null;
        String appliedName = null;
        BigDecimal discount = BigDecimal.ZERO.setScale(SCALE, RM);
        if (voucherCode != null && !voucherCode.isBlank()) {
            VoucherEvaluation ev = voucherService.evaluate(voucherCode, subtotal, nights, roomType.getId());
            if (!ev.valid()) {
                throw new IllegalArgumentException(ev.reason());
            }
            appliedCode = ev.voucher().getCode();
            appliedName = ev.voucher().getName();
            discount = ev.discount();
        }

        String currency = room.getHotel() != null && room.getHotel().getCurrency() != null
                && !room.getHotel().getCurrency().isBlank()
                ? room.getHotel().getCurrency().trim().toUpperCase()
                : "EUR";

        return new BookingQuote(
                room.getId(), roomType.getId(), checkIn, checkOut, nights, nightly,
                roomTotal.setScale(SCALE, RM), serviceLines, servicesTotal.setScale(SCALE, RM),
                appliedCode, appliedName, discount,
                subtotal.subtract(discount).max(BigDecimal.ZERO).setScale(SCALE, RM),
                currency);
    }

    /** Loads the chosen services; an unknown ID is an error, not silently dropped. */
    public List<ServiceEntity> loadServices(List<UUID> serviceIds) {
        if (serviceIds == null || serviceIds.isEmpty()) return new ArrayList<>();
        List<UUID> distinct = serviceIds.stream().distinct().toList();
        List<ServiceEntity> found = serviceRepository.findAllById(distinct);
        if (found.size() != distinct.size()) {
            throw new IllegalArgumentException("Unknown service selected");
        }
        return new ArrayList<>(found);
    }
}
