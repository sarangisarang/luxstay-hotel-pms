package com.booksys.room;
import com.booksys.hotel.Hotel;
import com.booksys.roomtype.RoomType;
import com.booksys.roomtype.RoomTypeDTO;
import com.booksys.roomtype.RoomTypeMapper;
import org.springframework.stereotype.Component;
import java.util.Objects;

@Component
public class RoomMapper {

    private final RoomTypeMapper roomTypeMapper;

    public RoomMapper(RoomTypeMapper roomTypeMapper) {
        this.roomTypeMapper = roomTypeMapper;
    }

    /** Entity -> DTO */
    public RoomDTO toDTO(Room entity) {
        if (entity == null) return null;
        RoomDTO dto = new RoomDTO();
        dto.setId(entity.getId());
        dto.setRoomNumber(entity.getRoomNumber());
        dto.setFloor(entity.getFloor());
        dto.setRoomStatus(entity.getRoomStatus());
        dto.setDescription(entity.getDescription());
        dto.setImageUrl(entity.getImageUrl());
        dto.setPrice(entity.getPrice());
        if (entity.getHotel() != null) {
            dto.setHotelId(entity.getHotel().getId());
            try {
                dto.setHotelName(
                        entity.getHotel().getName() != null ? entity.getHotel().getName() : null
                );
            } catch (Exception ignore) {}
        }

        if (entity.getRoomType() != null) {
            dto.setRoomTypeId(entity.getRoomType().getId());
            RoomTypeDTO rtDto = null;
            try {
                rtDto = roomTypeMapper.toDTO(entity.getRoomType());
            } catch (Exception ignore) {}
            dto.setRoomType(rtDto);
        }
        return dto;
    }

    /** DTO -> Entity (create) */
    public Room toEntity(RoomDTO dto) {
        if (dto == null) return null;
        Room room = new Room();

        room.setId(dto.getId());
        room.setRoomNumber(dto.getRoomNumber());
        room.setFloor(dto.getFloor());
        room.setRoomStatus(dto.getRoomStatus());
        room.setDescription(dto.getDescription());
        room.setImageUrl(dto.getImageUrl());
        room.setPrice(dto.getPrice());

        if (dto.getHotelId() != null) {
            Hotel hotel = new Hotel();
            hotel.setId(dto.getHotelId());
            room.setHotel(hotel);
        }

        if (dto.getRoomTypeId() != null) {
            RoomType roomType = new RoomType();
            roomType.setId(dto.getRoomTypeId());
            room.setRoomType(roomType);
        }
        return room;
    }

    /**
     * Partial update for PUT: update only provided fields;
     * DO NOT wipe imageUrl if missing/blank in DTO.
     */
    public void updateFromDto(Room target, RoomDTO dto) {
        if (target == null || dto == null) return;
        // basic fields
        if (dto.getRoomNumber() != null) target.setRoomNumber(dto.getRoomNumber());
        if (dto.getFloor() != null) target.setFloor(dto.getFloor());
        if (dto.getRoomStatus() != null) target.setRoomStatus(dto.getRoomStatus());
        if (dto.getDescription() != null) target.setDescription(dto.getDescription());
        if (dto.getPrice() != null) target.setPrice(dto.getPrice());
        // imageUrl — overwrite only if provided and not blank
        if (dto.getImageUrl() != null && !dto.getImageUrl().isBlank()) {
            target.setImageUrl(dto.getImageUrl());
        }
        // else: keep existing target.getImageUrl()

        // relations
        if (dto.getHotelId() != null) {
            if (target.getHotel() == null || !Objects.equals(target.getHotel().getId(), dto.getHotelId())) {
                Hotel hotel = new Hotel();
                hotel.setId(dto.getHotelId());
                target.setHotel(hotel);
            }
        }

        if (dto.getRoomTypeId() != null) {
            if (target.getRoomType() == null || !Objects.equals(target.getRoomType().getId(), dto.getRoomTypeId())) {
                RoomType roomType = new RoomType();
                roomType.setId(dto.getRoomTypeId());
                target.setRoomType(roomType);
            }
        }
    }
}
