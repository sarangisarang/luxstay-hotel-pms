package com.booksys.employee;

import org.mapstruct.Mapper;
import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface StaffMapper {

    static StaffDTO toDTO(Staff staff) {
        if (staff == null) return null;

        StaffDTO dto = new StaffDTO();
        dto.setId(staff.getId());
        dto.setFirstName(staff.getFirstName());
        dto.setLastName(staff.getLastName());
        dto.setPositions(staff.getPositions());
        dto.setSalary(staff.getSalary());
        dto.setDateOfBirth(staff.getDateOfBirth());
        dto.setPhone(staff.getPhone());
        dto.setEmail(staff.getEmail());
        dto.setHireDate(staff.getHireDate());

        if (staff.getHotel() != null) {
            dto.setHotelId(staff.getHotel().getId());
            dto.setHotelName(staff.getHotel().getName());
        }

        return dto;
    }

    default Staff toEntity(StaffDTO dto) {
        if (dto == null) return null;

        Staff staff = new Staff();
        staff.setId(dto.getId());
        staff.setFirstName(dto.getFirstName());
        staff.setLastName(dto.getLastName());
        staff.setPositions(dto.getPositions());
        staff.setSalary(dto.getSalary());
        staff.setDateOfBirth(dto.getDateOfBirth());
        staff.setPhone(dto.getPhone());
        staff.setEmail(dto.getEmail());
        staff.setHireDate(dto.getHireDate());

        return staff;
    }

    default List<StaffDTO> toDTOList(List<Staff> staffList) {
        if (staffList == null) return List.of();
        return staffList.stream().map(StaffMapper::toDTO).collect(Collectors.toList());
    }

    default List<Staff> toEntityList(List<StaffDTO> dtoList) {
        if (dtoList == null) return List.of();
        return dtoList.stream().map(this::toEntity).collect(Collectors.toList());
    }
}
