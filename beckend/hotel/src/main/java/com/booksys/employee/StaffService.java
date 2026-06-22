package com.booksys.employee;
import java.util.List;
import java.util.UUID;


public interface StaffService {
    StaffDTO createStaff(StaffDTO staffDTO);
    StaffDTO getStaffById(UUID id);
    List<StaffDTO> getAllStaff();
    StaffDTO updateStaff(UUID id, StaffDTO staffDTO);
    void deleteStaff(UUID id);
}

