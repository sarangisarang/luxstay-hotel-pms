package com.booksys.hotel;
import org.springframework.stereotype.Component;

@Component
public class HotelMapper {
    public HotelDTO toDTO(Hotel hotel) {
        if (hotel == null) return null;
        return HotelDTO.builder()
                .id(hotel.getId())
                .name(hotel.getName())
                .address(hotel.getAddress())
                .phone(hotel.getPhone())
                .email(hotel.getEmail())
                .description(hotel.getDescription())
                .rating(hotel.getRating())
                .imageId(hotel.getImageId())
                .imageName(hotel.getImageName())
                .latitude(hotel.getLatitude())
                .longitude(hotel.getLongitude())
                .city(hotel.getCity())
                .country(hotel.getCountry())
                .checkInTime(hotel.getCheckInTime())
                .checkOutTime(hotel.getCheckOutTime())
                .currency(hotel.getCurrency())
                .timezone(hotel.getTimezone())
                .website(hotel.getWebsite())
                .taxId(hotel.getTaxId())
                .cancellationPolicy(hotel.getCancellationPolicy())
                .starRating(hotel.getStarRating())
                .build();
    }

    public Hotel toEntity(HotelDTO dto) {
        if (dto == null) return null;
        return Hotel.builder()
                .id(dto.getId())
                .name(dto.getName())
                .address(dto.getAddress())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .description(dto.getDescription())
                .rating(dto.getRating())
                .imageId(dto.getImageId())
                .imageName(dto.getImageName())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .city(dto.getCity())
                .country(dto.getCountry())
                .checkInTime(dto.getCheckInTime())
                .checkOutTime(dto.getCheckOutTime())
                .currency(dto.getCurrency())
                .timezone(dto.getTimezone())
                .website(dto.getWebsite())
                .taxId(dto.getTaxId())
                .cancellationPolicy(dto.getCancellationPolicy())
                .starRating(dto.getStarRating())
                .build();
    }
}
