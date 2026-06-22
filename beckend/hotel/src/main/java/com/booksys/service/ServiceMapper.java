package com.booksys.service;

import org.springframework.stereotype.Component;
import java.util.List;
import java.util.stream.Collectors;

@Component
public interface ServiceMapper {

    static ServiceDTO toDTO(ServiceEntity entity) {
        if (entity == null) return null;
        ServiceDTO dto = new ServiceDTO();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setDescription(entity.getDescription());
        dto.setPrice(entity.getPrice());
        return dto;
    }

    static ServiceEntity toEntity(ServiceDTO dto) {
        if (dto == null) return null;
        ServiceEntity entity = new ServiceEntity();
        entity.setId(dto.getId());
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setPrice(dto.getPrice());
        return entity;
    }

    static List<ServiceDTO> toDTOList(List<ServiceEntity> entities) {
        return entities.stream()
                .map(ServiceMapper::toDTO)
                .collect(Collectors.toList());
    }

    static List<ServiceEntity> toEntityList(List<ServiceDTO> dtos) {
        return dtos.stream()
                .map(ServiceMapper::toEntity)
                .collect(Collectors.toList());
    }
}