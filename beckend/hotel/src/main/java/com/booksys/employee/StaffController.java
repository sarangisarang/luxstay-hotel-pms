package com.booksys.employee;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService staffService;

    @Autowired
    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    // 1. Get all staff members
    @GetMapping
    public ResponseEntity<List<StaffDTO>> getAllStaff() {
        List<StaffDTO> staffList = staffService.getAllStaff();
        return ResponseEntity.ok(staffList);
    }

    // 2. Get staff member by ID
    @GetMapping("/{id}")
    public ResponseEntity<StaffDTO> getStaffById(@PathVariable("id") UUID id) {
        StaffDTO staff = staffService.getStaffById(id);
        return ResponseEntity.ok(staff);
    }

    // 3. Create new staff member
    @PostMapping
    public ResponseEntity<StaffDTO> createStaff(@RequestBody StaffDTO staffDTO) {
        StaffDTO created = staffService.createStaff(staffDTO);
        return ResponseEntity.ok(created);
    }

    // 4. Update existing staff member
    @PutMapping("/{id}")
    public ResponseEntity<StaffDTO> updateStaff(@PathVariable("id") UUID id,
                                                @RequestBody StaffDTO staffDTO) {
        StaffDTO updated = staffService.updateStaff(id, staffDTO);
        return ResponseEntity.ok(updated);
    }

    // 5. Delete staff member
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStaff(@PathVariable("id") UUID id) {
        staffService.deleteStaff(id);
        return ResponseEntity.noContent().build();
    }
}
