package com.booksys.roomtype;
import com.booksys.pricing.DynamicPricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST Controller for Room Type management.
 */
@RestController
@RequestMapping("/api/room-types")
@RequiredArgsConstructor
public class RoomTypeController {

    private final RoomTypeService roomTypeService;
    private final RoomTypeMapper roomTypeMapper;
    private final FileStorageUtil fileStorageUtil;
    private final DynamicPricingService dynamicPricingService;


    @PostMapping
    public ResponseEntity<RoomTypeDTO> save(@RequestBody RoomTypeDTO dto) {
        RoomTypeDTO saved = roomTypeService.save(dto);
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<RoomTypeDTO>> getAll() {
        return ResponseEntity.ok(roomTypeService.getAllDTO());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoomType> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(roomTypeService.getById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        roomTypeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{roomTypeId}/upload-image")
    public ResponseEntity<String> uploadRoomTypeImage(
            @PathVariable UUID roomTypeId,
            @RequestParam("image") MultipartFile file) throws IOException {

        String imageUrl = roomTypeService.uploadImage(roomTypeId, file);
        return ResponseEntity.ok(imageUrl);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoomTypeDTO> updateRoomType(
            @PathVariable UUID id,
            @RequestBody RoomTypeDTO roomTypeDTO
    ) {
        RoomTypeDTO updated = roomTypeService.updateRoomType(id, roomTypeDTO);
        return ResponseEntity.ok(updated);
    }


    /**
     * Returns a price estimate for a room type over the requested date range,
     * applying weekend and peak-season uplifts.
     * GET /api/room-types/{id}/price-estimate?checkIn=2025-07-04&checkOut=2025-07-07
     */
    @GetMapping("/{id}/price-estimate")
    public ResponseEntity<Map<String, Object>> priceEstimate(
            @PathVariable UUID id,
            @RequestParam LocalDate checkIn,
            @RequestParam LocalDate checkOut) {

        RoomType rt = roomTypeService.getById(id);
        BigDecimal base  = rt.getPricePerNight() != null ? rt.getPricePerNight() : BigDecimal.ZERO;
        BigDecimal total = dynamicPricingService.calculateTotal(base, checkIn, checkOut);
        long nights = java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut);

        return ResponseEntity.ok(Map.of(
                "roomTypeId",    id,
                "checkIn",       checkIn.toString(),
                "checkOut",      checkOut.toString(),
                "nights",        nights,
                "basePerNight",  base,
                "totalEstimate", total
        ));
    }

    @GetMapping(value = "/roomtype/{filename:.+}", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<Resource> getRoomTypeImage(@PathVariable String filename) throws IOException {
        Path file = Paths.get("uploads/roomtype").resolve(filename);
        Resource resource = new UrlResource(file.toUri());
        if (resource.exists() || resource.isReadable()) {
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(resource);
        } else {
            throw new FileNotFoundException("Could not read file: " + filename);
        }
    }
}