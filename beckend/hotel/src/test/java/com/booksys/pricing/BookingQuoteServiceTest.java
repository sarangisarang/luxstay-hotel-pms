package com.booksys.pricing;

import com.booksys.hotel.Hotel;
import com.booksys.room.Room;
import com.booksys.roomtype.RoomType;
import com.booksys.service.ServiceEntity;
import com.booksys.service.ServiceRepository;
import com.booksys.room.RoomRepository;
import com.booksys.voucher.DiscountType;
import com.booksys.voucher.Voucher;
import com.booksys.voucher.VoucherEvaluation;
import com.booksys.voucher.VoucherService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * The server-side price must match what the reception's booking path charges
 * (same dynamic pricing) and must include services and vouchers.
 */
@ExtendWith(MockitoExtension.class)
class BookingQuoteServiceTest {

    @Mock RoomRepository roomRepository;
    @Mock ServiceRepository serviceRepository;
    @Mock VoucherService voucherService;

    BookingQuoteService service;
    Room room;
    RoomType roomType;

    @BeforeEach
    void setUp() {
        service = new BookingQuoteService(roomRepository, serviceRepository, new DynamicPricingService(), voucherService);
        roomType = new RoomType();
        roomType.setId(UUID.randomUUID());
        roomType.setPricePerNight(new BigDecimal("100.00"));
        Hotel hotel = new Hotel();
        hotel.setCurrency("eur");
        room = new Room();
        room.setId(UUID.randomUUID());
        room.setRoomType(roomType);
        room.setHotel(hotel);
    }

    @Test
    void nightlyPricesUseTheSameUpliftsAsTheReception() {
        // 2026-11-12 (Thu) → 2026-11-15 (Sun): Thu normal, Fri +30 %, Sat +30 %
        BookingQuote q = service.quote(room, LocalDate.of(2026, 11, 12), LocalDate.of(2026, 11, 15), List.of(), null);

        assertThat(q.nights()).isEqualTo(3);
        assertThat(q.roomTotal()).isEqualByComparingTo("360.00");
        assertThat(q.total()).isEqualByComparingTo("360.00");
        assertThat(q.currency()).isEqualTo("EUR");
        assertThat(q.totalInMinorUnits()).isEqualTo(36000L);
        assertThat(q.roomTotal()).isEqualByComparingTo(new DynamicPricingService()
                .calculateTotal(new BigDecimal("100.00"), LocalDate.of(2026, 11, 12), LocalDate.of(2026, 11, 15)));
    }

    @Test
    void servicesAndVoucherAreIncludedInTheTotal() {
        ServiceEntity breakfast = new ServiceEntity();
        breakfast.setId(UUID.randomUUID());
        breakfast.setName("Breakfast");
        breakfast.setPrice(new BigDecimal("25.00"));
        Voucher v = Voucher.builder().code("TEN").name("Ten off").discountType(DiscountType.FIXED)
                .discountValue(BigDecimal.TEN).build();
        when(voucherService.evaluate(eq("ten"), any(), anyLong(), eq(roomType.getId())))
                .thenReturn(new VoucherEvaluation(true, null, v, new BigDecimal("10.00")));

        // Mon → Tue, one normal night
        BookingQuote q = service.quote(room, LocalDate.of(2026, 11, 9), LocalDate.of(2026, 11, 10),
                List.of(breakfast), "ten");

        assertThat(q.servicesTotal()).isEqualByComparingTo("25.00");
        assertThat(q.discount()).isEqualByComparingTo("10.00");
        assertThat(q.voucherCode()).isEqualTo("TEN");
        assertThat(q.total()).isEqualByComparingTo("115.00");
    }

    @Test
    void invalidVoucherIsReportedNotSilentlyIgnored() {
        when(voucherService.evaluate(eq("BAD"), any(), anyLong(), any()))
                .thenReturn(VoucherEvaluation.rejected("Voucher has expired", null));

        assertThatThrownBy(() -> service.quote(room, LocalDate.of(2026, 11, 9), LocalDate.of(2026, 11, 10),
                List.of(), "BAD"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Voucher has expired");
    }

    @Test
    void unknownServiceIdIsRejected() {
        UUID known = UUID.randomUUID();
        UUID unknown = UUID.randomUUID();
        ServiceEntity s = new ServiceEntity();
        s.setId(known);
        when(serviceRepository.findAllById(List.of(known, unknown))).thenReturn(List.of(s));

        assertThatThrownBy(() -> service.loadServices(List.of(known, unknown)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void checkOutMustBeAfterCheckIn() {
        LocalDate d = LocalDate.of(2026, 11, 9);
        assertThatThrownBy(() -> service.quote(room, d, d, List.of(), null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
