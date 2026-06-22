package com.booksys.hotel;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Default implementation of {@link HotelService}.
 * Manages hotel records including image name storage. Image files themselves are
 * handled by {@link ImageService}; this service only persists the resulting file name.
 */
@Service
@RequiredArgsConstructor
public class HotelServiceImpl implements HotelService {

    private final HotelRepository hotelRepository;
    private final HotelMapper hotelMapper;

    @Override
    public HotelDTO saveHotel(HotelDTO hotelDTO) {
        Hotel hotel = hotelMapper.toEntity(hotelDTO);
        if (hotelDTO.getImageName() != null) {
            hotel.setImageName(hotelDTO.getImageName());
        }
        return hotelMapper.toDTO(hotelRepository.save(hotel));
    }

    @Override
    public HotelDTO updateHotel(UUID id, HotelDTO hotelDTO) {
        Hotel existing = hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Hotel not found: " + id));
        existing.setName(hotelDTO.getName());
        existing.setAddress(hotelDTO.getAddress());
        existing.setPhone(hotelDTO.getPhone());
        existing.setEmail(hotelDTO.getEmail());
        existing.setDescription(hotelDTO.getDescription());
        existing.setRating(hotelDTO.getRating());
        if (hotelDTO.getLatitude() != null)  existing.setLatitude(hotelDTO.getLatitude());
        if (hotelDTO.getLongitude() != null) existing.setLongitude(hotelDTO.getLongitude());
        return hotelMapper.toDTO(hotelRepository.save(existing));
    }

    @Override
    public void saveHotelEntity(Hotel hotel) {
        hotelRepository.save(hotel);
    }

    @Override
    public List<HotelDTO> getAllHotels() {
        return hotelRepository.findAll().stream()
                .map(hotelMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public Hotel getById(UUID id) {
        return hotelRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Hotel not found: " + id));
    }

    @Override
    public void delete(UUID id) {
        hotelRepository.deleteById(id);
    }
}
