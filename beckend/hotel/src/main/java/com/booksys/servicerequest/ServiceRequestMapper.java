package com.booksys.servicerequest;

import com.booksys.guest.Guest;
import com.booksys.service.ServiceEntity;
import org.mapstruct.Mapper;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
@Mapper(componentModel = "spring")
public interface ServiceRequestMapper {

    DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    // DTO -> Entity (create)
    static ServiceRequest toEntity(ServiceRequestDTO dto, Guest guest, ServiceEntity service) {
        return ServiceRequest.builder()
                .id(dto.getId())
                .guest(guest)
                .service(service)
                .status(dto.getStatus())
                .description(dto.getDescription())
                .requestDate(dto.getRequestDate() != null ? dto.getRequestDate() : LocalDateTime.now())
                .build();
    }
    // Entity -> DTO (response)
    static ServiceRequestDTO toDTO(ServiceRequest entity) {
        return ServiceRequestDTO.builder()
                .id(entity.getId())
                .guestId(entity.getGuest().getId())
                .serviceId(entity.getService().getId())
                .status(entity.getStatus())
                .requestDate(entity.getRequestDate())
                .description(entity.getDescription())
                .build();
    }
}
