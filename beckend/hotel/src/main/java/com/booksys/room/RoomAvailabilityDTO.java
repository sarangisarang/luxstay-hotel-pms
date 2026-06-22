package com.booksys.room;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class RoomAvailabilityDTO {
    private UUID roomId;
    private String roomNumber;
    private List<LocalDate> bookedDates;
}
