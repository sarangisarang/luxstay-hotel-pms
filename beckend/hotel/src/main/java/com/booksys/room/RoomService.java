package com.booksys.room;
import java.util.List;
import java.util.UUID;

/**
 * Service interface for managing Rooms.
 */
public interface RoomService {
    Room createRoom(Room room);
    List<Room> getAllRooms();
    Room getRoomById(UUID id);
    void deleteRoom(UUID id);
    List<RoomDTO>getAvailableRooms();
    Room updateRoom(UUID id, RoomDTO dto);
}