package com.booksys.guest;
import org.mapstruct.Mapper;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface GuestMapper {

    static GuestDTO toDTO(Guest guest) {
        if (guest == null) return null;

        GuestDTO dto = new GuestDTO();
        dto.setId(guest.getId());
        dto.setFirstName(guest.getFirstName());
        dto.setLastName(guest.getLastName());
        dto.setEmail(guest.getEmail());
        dto.setPhone(guest.getPhone());
        dto.setAddress(guest.getAddress());
        dto.setCountry(guest.getCountry());
        dto.setNationality(guest.getNationality());
        dto.setPassportNumber(guest.getPassportNumber());
        dto.setBirthDate(guest.getBirthDate());

        return dto;
    }

    static Guest toEntity(GuestDTO dto) {
        if (dto == null) return null;

        Guest guest = new Guest();
        guest.setId(dto.getId() != null ? dto.getId() : UUID.randomUUID());
        guest.setFirstName(dto.getFirstName());
        guest.setLastName(dto.getLastName());
        guest.setEmail(dto.getEmail());
        guest.setPhone(dto.getPhone());
        guest.setAddress(dto.getAddress());
        guest.setCountry(dto.getCountry());
        guest.setNationality(dto.getNationality());
        guest.setPassportNumber(dto.getPassportNumber());
        guest.setBirthDate(dto.getBirthDate());

        return guest;
    }

    default List<GuestDTO> toDTOList(List<Guest> guests) {
        if (guests == null) return new ArrayList<>();
        return guests.stream().map(GuestMapper::toDTO).collect(Collectors.toList());
    }

    default List<Guest> toEntityList(List<GuestDTO> guestDTOs) {
        if (guestDTOs == null) return new ArrayList<>();
        return guestDTOs.stream().map(GuestMapper::toEntity).collect(Collectors.toList());
    }
}