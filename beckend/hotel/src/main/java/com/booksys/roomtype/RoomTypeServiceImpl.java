package com.booksys.roomtype;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomTypeServiceImpl implements RoomTypeService {

    private final RoomTypeRepository roomTypeRepository;

    @Autowired
    private FileStorageUtil fileStorageUtil;

    @Autowired
    private final RoomTypeMapper roomTypeMapper;

    @Override
    public List<RoomTypeDTO> getAllDTO() {
        return roomTypeRepository.findAll()
                .stream()
                .map(roomTypeMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public String uploadImage(UUID roomTypeId, MultipartFile file) throws IOException {
        String filename = fileStorageUtil.saveFile(file, "roomtype");
        RoomType roomType = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new EntityNotFoundException("RoomType not found: " + roomTypeId));
        roomType.setImageUrl(filename);
        roomTypeRepository.save(roomType);
        return filename;
    }

    @Override
    public RoomTypeDTO updateRoomType(UUID id, RoomTypeDTO roomTypeDTO) {
        RoomType existingRoomType = roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("RoomType not found: " + id));

        existingRoomType.setName(roomTypeDTO.getName());
        existingRoomType.setDescription(roomTypeDTO.getDescription());
        existingRoomType.setPricePerNight(roomTypeDTO.getPricePerNight());
        existingRoomType.setCapacity(roomTypeDTO.getCapacity());

        existingRoomType.setAirConditioning(roomTypeDTO.isAirConditioning());
        existingRoomType.setInternet(roomTypeDTO.isInternet());
        existingRoomType.setToilet(roomTypeDTO.isToilet());
        existingRoomType.setBed(roomTypeDTO.isBed());
        existingRoomType.setTv(roomTypeDTO.isTv());
        existingRoomType.setBalcony(roomTypeDTO.isBalcony());
        existingRoomType.setMinibar(roomTypeDTO.isMinibar());
        existingRoomType.setHeating(roomTypeDTO.isHeating());
        existingRoomType.setSafe(roomTypeDTO.isSafe());
        existingRoomType.setHairDryer(roomTypeDTO.isHairDryer());
        existingRoomType.setRoomService(roomTypeDTO.isRoomService());

        if (roomTypeDTO.getImageUrl() != null && !roomTypeDTO.getImageUrl().isEmpty()) {
            String imageName = roomTypeMapper.toEntity(roomTypeDTO).getImageUrl();
            existingRoomType.setImageUrl(imageName);
        }

        return roomTypeMapper.toDTO(roomTypeRepository.save(existingRoomType));
    }

    @Override
    public RoomTypeDTO save(RoomTypeDTO dto) {
        RoomType roomType = roomTypeMapper.toEntity(dto);
        return roomTypeMapper.toDTO(roomTypeRepository.save(roomType));
    }

    @Override
    public List<RoomType> getAll() {
        return roomTypeRepository.findAll();
    }

    @Override
    public RoomType getById(UUID id) {
        return roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("RoomType not found: " + id));
    }

    @Override
    public void delete(UUID id) {
        roomTypeRepository.deleteById(id);
    }

    public boolean existsByName(String name) {
        return roomTypeRepository.existsByName(name);
    }

    public RoomTypeDTO getRoomTypeById(UUID id) {
        return roomTypeMapper.toDTO(roomTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("RoomType not found: " + id)));
    }
}
