package com.booksys.room;
import com.booksys.booking.BookingService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final RoomMapper roomMapper;
    private final RoomRepository roomRepository;
    private final BookingService bookingService;
    private final com.booksys.upload.ImageUploadService imageUploadService;

    @Value("${app.server.url:http://localhost:8080}")
    private String serverUrl;

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/save")
    public ResponseEntity<RoomDTO> save(@RequestBody RoomDTO roomDTO) {
        Room room = roomMapper.toEntity(roomDTO);
        Room savedRoom = roomService.createRoom(room);
        RoomDTO savedRoomDTO = roomMapper.toDTO(savedRoom);
        return ResponseEntity.ok(savedRoomDTO);
    }

    @GetMapping
    public ResponseEntity<List<RoomDTO>> getAll() {
        List<Room> rooms = roomService.getAllRooms();
        List<RoomDTO> roomDTOs = rooms.stream()
                .map(roomMapper::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(roomDTOs);
    }

    @PostMapping("/{roomId}/upload-image")
    public ResponseEntity<String> uploadRoomImage(@PathVariable UUID roomId,
                                                  @RequestParam("file") MultipartFile file) throws IOException {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found: " + roomId));

        // Validated image, random file name (the client's name is never used on disk)
        String filename = imageUploadService.store(file, "");
        String imageUrl = serverUrl.replaceAll("/+$", "") + "/uploads/" + filename;
        room.setImageUrl(imageUrl);
        roomRepository.save(room);

        return ResponseEntity.ok(imageUrl);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomDTO> updateRoom(@PathVariable UUID id, @RequestBody RoomDTO dto) {
        Room updated = roomService.updateRoom(id, dto);
        return ResponseEntity.ok(roomMapper.toDTO(updated));
    }

    @GetMapping("/available")
    public ResponseEntity<List<RoomDTO>> getAvailableRooms() {
        return ResponseEntity.ok(roomService.getAvailableRooms());
    }

    @GetMapping("/availability")
    public List<RoomAvailabilityDTO> getAllRoomsAvailability() {
        return bookingService.getAllRoomsAvailability();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomDTO> getById(@PathVariable UUID id) {
        Room room = roomService.getRoomById(id);
        RoomDTO roomDTO = roomMapper.toDTO(room);
        return ResponseEntity.ok(roomDTO);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        roomService.deleteRoom(id);
        return ResponseEntity.noContent().build();
    }
}
