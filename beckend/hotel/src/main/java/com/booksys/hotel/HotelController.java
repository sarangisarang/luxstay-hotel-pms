package com.booksys.hotel;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for hotel management.
 *
 * <p>Base path: {@code /api/hotels}</p>
 *
 * <p>All endpoints return {@link HotelDTO} to avoid exposing lazy-loaded collections
 * or internal entity state. Image uploads are handled separately and return only
 * the stored image name so that the caller can construct the full URL.</p>
 */
@RestController
@RequestMapping("/api/hotels")
@RequiredArgsConstructor
public class HotelController {

    private final HotelService hotelService;
    private final HotelMapper hotelMapper;
    private final ImageService imageService;

    /**
     * Creates a new hotel from the provided DTO.
     *
     * @param hotelDTO DTO containing hotel details (name, address, phone, email, etc.)
     * @return 200 OK with the persisted hotel DTO
     */
    @PostMapping("/save")
    public ResponseEntity<HotelDTO> saveHotel(@RequestBody HotelDTO hotelDTO) {
        return ResponseEntity.ok(hotelService.saveHotel(hotelDTO));
    }

    /**
     * Returns all hotels in the system.
     *
     * @return 200 OK with a list of hotel DTOs; empty list if none exist
     */
    @GetMapping
    public ResponseEntity<List<HotelDTO>> getAllHotels() {
        return ResponseEntity.ok(hotelService.getAllHotels());
    }

    /**
     * Returns a single hotel by its UUID as a DTO.
     * Returns DTO (not the raw entity) to prevent lazy-loading issues and
     * avoid exposing internal collections to clients.
     *
     * @param id UUID of the hotel
     * @return 200 OK with the hotel DTO
     */
    @GetMapping("/{id}")
    public ResponseEntity<HotelDTO> getById(@PathVariable UUID id) {
        Hotel hotel = hotelService.getById(id);
        return ResponseEntity.ok(hotelMapper.toDTO(hotel));
    }

    /**
     * Permanently deletes a hotel by its UUID.
     *
     * @param id UUID of the hotel to delete
     * @return 204 No Content
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        hotelService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Uploads an image file for a hotel and associates it with the hotel record.
     * The stored file name is returned so the client can build the public URL.
     *
     * @param file    the image file (multipart)
     * @param hotelId UUID of the hotel to attach the image to
     * @return 200 OK with a map containing the key {@code "imageName"} → stored file name
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("hotelId") UUID hotelId
    ) {
        String imageName = imageService.save(file, hotelId);
        Hotel hotel = hotelService.getById(hotelId);
        hotel.setImageName(imageName);
        hotelService.saveHotelEntity(hotel);
        return ResponseEntity.ok(Map.of("imageName", imageName));
    }

    /**
     * Updates an existing hotel's details.
     *
     * @param id       UUID of the hotel to update
     * @param hotelDTO DTO carrying the new field values
     * @return 200 OK with the updated hotel DTO
     */
    @PutMapping("/{id}")
    public ResponseEntity<HotelDTO> updateHotel(@PathVariable UUID id, @RequestBody HotelDTO hotelDTO) {
        return ResponseEntity.ok(hotelService.updateHotel(id, hotelDTO));
    }

    /**
     * Partial update for hotel operational settings (check-in/out times, currency, timezone, policies, etc.).
     */
    @PatchMapping("/{id}/settings")
    public ResponseEntity<HotelDTO> patchSettings(@PathVariable UUID id, @RequestBody Map<String, Object> settings) {
        Hotel hotel = hotelService.getById(id);
        if (settings.containsKey("checkInTime"))        hotel.setCheckInTime((String) settings.get("checkInTime"));
        if (settings.containsKey("checkOutTime"))       hotel.setCheckOutTime((String) settings.get("checkOutTime"));
        if (settings.containsKey("currency"))           hotel.setCurrency((String) settings.get("currency"));
        if (settings.containsKey("timezone"))           hotel.setTimezone((String) settings.get("timezone"));
        if (settings.containsKey("website"))            hotel.setWebsite((String) settings.get("website"));
        if (settings.containsKey("taxId"))              hotel.setTaxId((String) settings.get("taxId"));
        if (settings.containsKey("cancellationPolicy")) hotel.setCancellationPolicy((String) settings.get("cancellationPolicy"));
        if (settings.containsKey("starRating"))         hotel.setStarRating(((Number) settings.get("starRating")).intValue());
        if (settings.containsKey("phone"))              hotel.setPhone((String) settings.get("phone"));
        if (settings.containsKey("email"))              hotel.setEmail((String) settings.get("email"));
        if (settings.containsKey("address"))            hotel.setAddress((String) settings.get("address"));
        if (settings.containsKey("city"))               hotel.setCity((String) settings.get("city"));
        if (settings.containsKey("country"))            hotel.setCountry((String) settings.get("country"));
        if (settings.containsKey("description"))        hotel.setDescription((String) settings.get("description"));
        if (settings.containsKey("latitude"))           hotel.setLatitude(((Number) settings.get("latitude")).doubleValue());
        if (settings.containsKey("longitude"))          hotel.setLongitude(((Number) settings.get("longitude")).doubleValue());
        hotelService.saveHotelEntity(hotel);
        return ResponseEntity.ok(hotelMapper.toDTO(hotel));
    }
}