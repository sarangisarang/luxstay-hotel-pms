package com.booksys.room;
import com.booksys.roomtype.RoomTypeDTO;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class RoomDTO {
    private UUID id;
    private Integer roomNumber;
    private String floor;
    private UUID roomTypeId;
    private BigDecimal price;
    private UUID hotelId;
    private RoomStatus roomStatus;
    private String description;
    private String imageUrl;
    private String hotelName;
    private RoomTypeDTO roomType;
}