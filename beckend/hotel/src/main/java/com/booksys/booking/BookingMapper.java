package com.booksys.booking;

import com.booksys.guest.Guest;
import com.booksys.room.Room;
import com.booksys.service.ServiceDTO;
import com.booksys.service.ServiceEntity;
import org.mapstruct.Mapper;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * MapStruct mapper for converting between {@link Booking} entities and {@link BookingDTO}s.
 *
 * <p>All conversion methods are null-safe: passing {@code null} returns {@code null} (entity→DTO)
 * or {@code null} (DTO→entity) without throwing an exception. Guest and room names are
 * denormalized into the DTO for convenient display without additional joins.</p>
 *
 * <p>Financial values ({@link java.math.BigDecimal}) are coerced to zero when {@code null}
 * via the private {@link #nz(java.math.BigDecimal)} helper, avoiding {@link NullPointerException}s
 * in arithmetic downstream.</p>
 */
@Mapper(componentModel = "spring")
public interface BookingMapper {

    /**
     * Converts a {@link Booking} entity to a {@link BookingDTO}, resolving guest name,
     * room number, services, and financial totals from the entity graph.
     *
     * @param booking the booking entity (may be {@code null})
     * @return the corresponding DTO, or {@code null} if {@code booking} is {@code null}
     */
    default BookingDTO toDto(Booking booking) {
        if (booking == null) return null;

        BookingDTO dto = new BookingDTO();
        dto.setId(booking.getId());

        // ---- Guest ----
        if (booking.getGuest() != null) {
            Guest g = booking.getGuest();
            dto.setGuestId(g.getId());
            String first = g.getFirstName() != null ? g.getFirstName() : "";
            String last  = g.getLastName()  != null ? g.getLastName()  : "";
            String name  = (first + " " + last).trim();
            dto.setGuestName(name.isEmpty() ? "Unknown Guest" : name);
        } else {
            dto.setGuestId(null);
            dto.setGuestName(booking.getGuestName() != null ? booking.getGuestName() : "Unknown Guest");
        }

        // ---- Room ----
        if (booking.getRoom() != null) {
            Room r = booking.getRoom();
            dto.setRoomId(r.getId());
            dto.setRoomNumber(r.getRoomNumber());
        } else {
            dto.setRoomId(null);
            dto.setRoomNumber(booking.getRoomNumber()); // თუ entity-ზე გაქვს ეს ველი, ვიყენებთ მას
        }

        // ---- Dates & Status ----
        dto.setCheckInDate(booking.getCheckInDate());
        dto.setCheckOutDate(booking.getCheckOutDate());
        dto.setBookingStatus(booking.getBookingStatus());
        dto.setPaymentStatus(booking.getPaymentStatus());

        // ---- Amounts (null-safe) ----
        dto.setTotalAmount(nz(booking.getTotalAmount()));
        dto.setTotalServiceAmount(nz(booking.getTotalServiceAmount()));

        // ---- Services (flat list) ----
        List<ServiceDTO> serviceDTOs = new ArrayList<>();
        if (booking.getServices() != null) {
            for (ServiceEntity s : booking.getServices()) {
                if (s == null) continue;
                ServiceDTO sd = new ServiceDTO();
                sd.setId(s.getId());
                sd.setName(s.getName());
                sd.setPrice(s.getPrice());
                serviceDTOs.add(sd);
            }
        }
        dto.setServices(serviceDTOs);
        dto.setBookingSource(booking.getBookingSource());
        dto.setSpecialRequests(booking.getSpecialRequests());

        return dto;
    }

    /**
     * Converts a {@link BookingDTO} and its related entities into a {@link Booking} entity.
     * Denormalized convenience fields ({@code guestName}, {@code roomNumber}) are derived
     * from the provided entity references when available, falling back to DTO values.
     *
     * @param dto      the source DTO (may be {@code null})
     * @param guest    the resolved {@link Guest} entity (may be {@code null})
     * @param room     the resolved {@link Room} entity (may be {@code null})
     * @param services the resolved list of {@link ServiceEntity} objects (may be {@code null})
     * @return the corresponding entity, or {@code null} if {@code dto} is {@code null}
     */
    default Booking toEntity(BookingDTO dto, Guest guest, Room room, List<ServiceEntity> services) {
        if (dto == null) return null;

        Booking b = new Booking();
        b.setId(dto.getId());

        // Attach relations (may be null)
        b.setGuest(guest);
        b.setRoom(room);

        // Mirror simple fields
        b.setCheckInDate(dto.getCheckInDate());
        b.setCheckOutDate(dto.getCheckOutDate());
        b.setPaymentStatus(dto.getPaymentStatus());
        b.setBookingStatus(dto.getBookingStatus());
        b.setTotalAmount(nz(dto.getTotalAmount()));
        b.setTotalServiceAmount(nz(dto.getTotalServiceAmount()));

        // Denormalized convenience fields (if available)
        if (room != null) b.setRoomNumber(room.getRoomNumber());
        else b.setRoomNumber(dto.getRoomNumber());

        if (guest != null) {
            String first = guest.getFirstName() != null ? guest.getFirstName() : "";
            String last  = guest.getLastName()  != null ? guest.getLastName()  : "";
            b.setGuestName((first + " " + last).trim());
        } else if (dto.getGuestName() != null) {
            b.setGuestName(dto.getGuestName());
        }

        b.setServices(services != null ? services : new ArrayList<>());
        if (dto.getBookingSource() != null) b.setBookingSource(dto.getBookingSource());
        if (dto.getSpecialRequests() != null) b.setSpecialRequests(dto.getSpecialRequests());

        return b;
    }

    /**
     * Null-safe coercion: returns {@link BigDecimal#ZERO} when the value is {@code null},
     * preventing downstream {@link NullPointerException}s in arithmetic operations.
     *
     * @param v the value to coerce (may be {@code null})
     * @return {@code v} if non-null, otherwise {@link BigDecimal#ZERO}
     */
    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
