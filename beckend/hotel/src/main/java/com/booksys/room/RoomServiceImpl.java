package com.booksys.room;

import com.booksys.roomtype.RoomType;
import com.booksys.roomtype.RoomTypeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Default implementation of {@link RoomService}.
 *
 * <p>Handles all room lifecycle operations: creation (with duplicate room-number guard),
 * retrieval, status-aware availability listing, partial updates, and deletion.</p>
 *
 * <p>Note: the static {@code WebConfig} that previously lived here has been removed.
 * Upload static-resource mapping is handled via {@code spring.web.resources.static-locations}
 * in {@code application.properties}.</p>
 */
@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomMapper roomMapper;
    private final RoomTypeRepository roomTypeRepository;

    /**
     * Persists a new room, rejecting duplicate room numbers.
     *
     * @param room the room entity to save (must have a valid hotel and room type reference)
     * @return the saved room entity
     * @throws IllegalArgumentException if a room with the same room number already exists
     */
    @Override
    public Room createRoom(Room room) {
        if (roomRepository.existsByRoomNumber(room.getRoomNumber())) {
            throw new IllegalArgumentException("Room number already exists: " + room.getRoomNumber());
        }
        return roomRepository.save(room);
    }

    /**
     * Returns all rooms in the system regardless of status.
     *
     * @return list of all rooms; empty if none exist
     */
    @Override
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    /**
     * Returns a single room by its UUID.
     *
     * @param id UUID of the room
     * @return the room entity
     * @throws EntityNotFoundException if no room with the given ID exists
     */
    @Override
    public Room getRoomById(UUID id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Room not found: " + id));
    }

    /**
     * Returns all rooms with status {@link RoomStatus#FREE}, mapped to DTOs.
     *
     * @return list of available room DTOs; empty if no free rooms exist
     */
    @Override
    public List<RoomDTO> getAvailableRooms() {
        return roomRepository.findByRoomStatus(RoomStatus.FREE)
                .stream()
                .map(roomMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing room's mutable properties. The image URL is only updated
     * when a non-blank value is provided, preserving the existing image otherwise.
     * The room type is updated only when a new type ID is supplied.
     *
     * @param id  UUID of the room to update
     * @param dto DTO carrying updated field values
     * @return the updated room entity
     * @throws EntityNotFoundException if the room or the new room type does not exist
     */
    @Override
    public Room updateRoom(UUID id, RoomDTO dto) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Room not found: " + id));

        // Guard against changing to a room number already used by another room
        if (dto.getRoomNumber() != room.getRoomNumber()
                && roomRepository.existsByRoomNumber(dto.getRoomNumber())) {
            throw new IllegalArgumentException("Room number already exists: " + dto.getRoomNumber());
        }

        room.setRoomNumber(dto.getRoomNumber());
        room.setFloor(dto.getFloor());
        room.setDescription(dto.getDescription());
        room.setRoomStatus(dto.getRoomStatus());

        if (dto.getRoomTypeId() != null) {
            RoomType rt = roomTypeRepository.findById(dto.getRoomTypeId())
                    .orElseThrow(() -> new EntityNotFoundException("RoomType not found: " + dto.getRoomTypeId()));
            room.setRoomType(rt);
        }
        if (dto.getImageUrl() != null && !dto.getImageUrl().isBlank()) {
            room.setImageUrl(dto.getImageUrl());
        }
        return roomRepository.save(room);
    }

    /**
     * Permanently deletes a room by its UUID.
     *
     * @param id UUID of the room to delete
     * @throws EntityNotFoundException if no room with the given ID exists
     */
    @Override
    public void deleteRoom(UUID id) {
        if (!roomRepository.existsById(id)) {
            throw new EntityNotFoundException("Room not found: " + id);
        }
        roomRepository.deleteById(id);
    }
}


