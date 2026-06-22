package com.booksys.guest;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Default implementation of {@link GuestService}.
 * Guest profiles are automatically created during user registration
 * (see AuthenticationService) and can also be created manually by reception staff.
 */
@Service
@RequiredArgsConstructor
public class GuestServiceImpl implements GuestService {

    private final GuestRepository guestRepository;
    private final GuestMapper guestMapper;

    @Override
    public Guest createGuest(GuestDTO guestDTO) {
        Guest guest = GuestMapper.toEntity(guestDTO);
        return guestRepository.save(guest);
    }

    @Override
    public GuestDTO updateGuest(UUID guestId, GuestDTO guestDTO) {
        Guest existing = guestRepository.findById(guestId)
                .orElseThrow(() -> new EntityNotFoundException("Guest not found: " + guestId));

        existing.setFirstName(guestDTO.getFirstName());
        existing.setLastName(guestDTO.getLastName());
        existing.setEmail(guestDTO.getEmail());
        existing.setPhone(guestDTO.getPhone());
        existing.setAddress(guestDTO.getAddress());
        if (guestDTO.getCountry() != null) existing.setCountry(guestDTO.getCountry());
        if (guestDTO.getNationality() != null) existing.setNationality(guestDTO.getNationality());
        if (guestDTO.getPassportNumber() != null) existing.setPassportNumber(guestDTO.getPassportNumber());
        existing.setBirthDate(guestDTO.getBirthDate());

        return GuestMapper.toDTO(guestRepository.save(existing));
    }

    @Override
    public GuestDTO getGuestById(UUID guestId) {
        if (guestId == null) throw new IllegalArgumentException("Guest ID must not be null");
        return GuestMapper.toDTO(guestRepository.findById(guestId)
                .orElseThrow(() -> new EntityNotFoundException("Guest not found: " + guestId)));
    }

    @Override
    public Page<GuestDTO> getAllGuests(Pageable pageable) {
        return guestRepository.findAll(pageable).map(GuestMapper::toDTO);
    }

    @Override
    public void deleteGuest(UUID guestId) {
        if (!guestRepository.existsById(guestId)) {
            throw new EntityNotFoundException("Guest not found: " + guestId);
        }
        guestRepository.deleteById(guestId);
    }
}
