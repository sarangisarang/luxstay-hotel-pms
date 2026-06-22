package com.booksys.hotel;
import java.util.List;
import java.util.UUID;

/**
 * Service interface for managing hotels.
 */
public interface HotelService {
    HotelDTO saveHotel(HotelDTO hotelDTO);
    List<HotelDTO> getAllHotels();
    Hotel getById(UUID id);
    void delete(UUID id);
    HotelDTO updateHotel(UUID id, HotelDTO hotelDTO);
    void saveHotelEntity(Hotel hotel);

}
