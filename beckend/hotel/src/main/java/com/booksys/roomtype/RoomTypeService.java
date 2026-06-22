package com.booksys.roomtype;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Service interface for managing Room Types.
 */
public interface RoomTypeService {
    RoomTypeDTO save(RoomTypeDTO roomTypeDTO);
    List<RoomType> getAll();
    RoomType getById(UUID id);
    void delete(UUID id);
    List<RoomTypeDTO> getAllDTO();
    RoomTypeDTO getRoomTypeById(UUID id);
    RoomTypeDTO updateRoomType(UUID id, RoomTypeDTO roomTypeDTO);
    String uploadImage(UUID roomTypeId, MultipartFile file) throws IOException;
}