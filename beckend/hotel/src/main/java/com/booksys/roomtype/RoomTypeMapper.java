package com.booksys.roomtype;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RoomTypeMapper {

    @Value("${image.base.url:http://localhost:8080/roomtype/}")
    private String imageBaseUrl;

    public RoomTypeDTO toDTO(RoomType roomType) {
        if (roomType == null) return null;


        String imageUrl = roomType.getImageUrl();
        if (imageUrl != null && !imageUrl.trim().isEmpty()) {
            if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
                // already absolute — keep as-is
            } else if (imageUrl.startsWith("photo-")) {
                // Unsplash photo ID stored without host — serve from Unsplash CDN
                imageUrl = "https://images.unsplash.com/" + imageUrl;
            } else {
                imageUrl = imageBaseUrl + imageUrl;
            }
        } else {
            imageUrl = null;
        }

        return RoomTypeDTO.builder()
                .id(roomType.getId())
                .name(roomType.getName())
                .description(roomType.getDescription())
                .pricePerNight(roomType.getPricePerNight())
                .capacity(roomType.getCapacity())
                .imageUrl(imageUrl)
                .airConditioning(roomType.isAirConditioning())
                .internet(roomType.isInternet())
                .toilet(roomType.isToilet())
                .bed(roomType.isBed())
                .tv(roomType.isTv())
                .balcony(roomType.isBalcony())
                .minibar(roomType.isMinibar())
                .heating(roomType.isHeating())
                .safe(roomType.isSafe())
                .hairDryer(roomType.isHairDryer())
                .roomService(roomType.isRoomService())
                .soundproofing(roomType.isSoundproofing())
                .freeWifi(roomType.isFreeWifi())
                .fitnessCentre(roomType.isFitnessCentre())
                .flatScreenTv(roomType.isFlatScreenTv())
                .facilitiesForDisabledGuests(roomType.isFacilitiesForDisabledGuests())
                .nonSmokingRoom(roomType.isNonSmokingRoom())
                .shower(roomType.isShower())
                .towels(roomType.isTowels())
                .linen(roomType.isLinen())
                .telephone(roomType.isTelephone())
                .satelliteChannels(roomType.isSatelliteChannels())
                .desk(roomType.isDesk())
                .wardrobe(roomType.isWardrobe())
                .cityView(roomType.isCityView())
                .electricKettle(roomType.isElectricKettle())
                .clothesRack(roomType.isClothesRack())
                .socketNearBed(roomType.isSocketNearBed())
                .ironingFacilities(roomType.isIroningFacilities())
                .lift(roomType.isLift())
                .carpeted(roomType.isCarpeted())
                .wakeUpService(roomType.isWakeUpService())
                .allergyFreeRoom(roomType.isAllergyFreeRoom())
                .laptopSafe(roomType.isLaptopSafe())
                .upperFloorAccessible(roomType.isUpperFloorAccessible())
                .build();
    }

    public RoomType toEntity(RoomTypeDTO dto) {
        if (dto == null) return null;

        String imageName = dto.getImageUrl();
        if (imageName != null && imageName.startsWith(imageBaseUrl)) {
            imageName = imageName.replace(imageBaseUrl, "");
        }

        return RoomType.builder()
                .id(dto.getId())
                .name(dto.getName())
                .description(dto.getDescription())
                .pricePerNight(dto.getPricePerNight())
                .capacity(dto.getCapacity())
                .imageUrl(imageName)
                .airConditioning(dto.isAirConditioning())
                .internet(dto.isInternet())
                .toilet(dto.isToilet())
                .bed(dto.isBed())
                .tv(dto.isTv())
                .balcony(dto.isBalcony())
                .minibar(dto.isMinibar())
                .heating(dto.isHeating())
                .safe(dto.isSafe())
                .hairDryer(dto.isHairDryer())
                .roomService(dto.isRoomService())
                .soundproofing(dto.isSoundproofing())
                .freeWifi(dto.isFreeWifi())
                .fitnessCentre(dto.isFitnessCentre())
                .flatScreenTv(dto.isFlatScreenTv())
                .facilitiesForDisabledGuests(dto.isFacilitiesForDisabledGuests())
                .nonSmokingRoom(dto.isNonSmokingRoom())
                .shower(dto.isShower())
                .towels(dto.isTowels())
                .linen(dto.isLinen())
                .telephone(dto.isTelephone())
                .satelliteChannels(dto.isSatelliteChannels())
                .desk(dto.isDesk())
                .wardrobe(dto.isWardrobe())
                .cityView(dto.isCityView())
                .electricKettle(dto.isElectricKettle())
                .clothesRack(dto.isClothesRack())
                .socketNearBed(dto.isSocketNearBed())
                .ironingFacilities(dto.isIroningFacilities())
                .lift(dto.isLift())
                .carpeted(dto.isCarpeted())
                .wakeUpService(dto.isWakeUpService())
                .allergyFreeRoom(dto.isAllergyFreeRoom())
                .laptopSafe(dto.isLaptopSafe())
                .upperFloorAccessible(dto.isUpperFloorAccessible())
                .build();
    }
}
