package com.booksys.employee;

import com.booksys.hotel.Hotel;
import com.booksys.hotel.HotelRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Default implementation of {@link StaffService}.
 *
 * <p>Manages hotel staff (employee) records. Each staff member must be associated
 * with an existing hotel. The hotel name is denormalized onto the {@link Staff} entity
 * for read convenience.</p>
 */
@Service
@RequiredArgsConstructor
public class StaffServiceImpl implements StaffService {

    private final StaffMapper staffMapper;
    private final HotelRepository hotelRepository;
    private final StaffRepository staffRepository;

    /**
     * Creates a new staff member and links them to the specified hotel.
     *
     * @param dto DTO containing staff details and the hotel ID
     * @return the persisted staff member as a DTO
     * @throws EntityNotFoundException if no hotel with the given ID exists
     */
    @Override
    public StaffDTO createStaff(StaffDTO dto) {
        Hotel hotel = hotelRepository.findById(dto.getHotelId())
                .orElseThrow(() -> new EntityNotFoundException("Hotel not found: " + dto.getHotelId()));

        Staff staff = staffMapper.toEntity(dto);
        staff.setHotel(hotel);
        staff.setHotelName(hotel.getName());

        return StaffMapper.toDTO(staffRepository.save(staff));
    }

    /**
     * Returns a single staff member by their UUID.
     *
     * @param staffId UUID of the staff member
     * @return the staff member as a DTO
     * @throws EntityNotFoundException if no staff member with the given ID exists
     */
    @Override
    public StaffDTO getStaffById(UUID staffId) {
        return staffRepository.findById(staffId)
                .map(StaffMapper::toDTO)
                .orElseThrow(() -> new EntityNotFoundException("Staff not found: " + staffId));
    }

    /**
     * Returns all staff members across all hotels.
     *
     * @return list of all staff as DTOs; empty list if none exist
     */
    @Override
    public List<StaffDTO> getAllStaff() {
        return staffRepository.findAll().stream()
                .map(StaffMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Updates a staff member's personal and employment details.
     * The associated hotel is not changed during an update.
     *
     * @param id       UUID of the staff member to update
     * @param staffDTO DTO carrying the new field values
     * @return the updated staff member as a DTO
     * @throws EntityNotFoundException if no staff member with the given ID exists
     */
    @Override
    public StaffDTO updateStaff(UUID id, StaffDTO staffDTO) {
        Staff existing = staffRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Staff not found: " + id));

        existing.setFirstName(staffDTO.getFirstName());
        existing.setLastName(staffDTO.getLastName());
        existing.setPositions(staffDTO.getPositions());
        existing.setSalary(staffDTO.getSalary());
        existing.setDateOfBirth(staffDTO.getDateOfBirth());
        existing.setPhone(staffDTO.getPhone());
        existing.setEmail(staffDTO.getEmail());
        existing.setHireDate(staffDTO.getHireDate());

        return StaffMapper.toDTO(staffRepository.save(existing));
    }

    /**
     * Permanently deletes a staff member by their UUID.
     *
     * @param id UUID of the staff member to delete
     * @throws EntityNotFoundException if no staff member with the given ID exists
     */
    @Override
    public void deleteStaff(UUID id) {
        if (!staffRepository.existsById(id)) {
            throw new EntityNotFoundException("Staff not found: " + id);
        }
        staffRepository.deleteById(id);
    }
}
