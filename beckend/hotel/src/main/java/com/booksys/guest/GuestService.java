package com.booksys.guest;

import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface GuestService {

    Guest createGuest(GuestDTO guestDTO);
    GuestDTO updateGuest(UUID guestId, GuestDTO guestDTO);
    GuestDTO getGuestById(UUID guestId);
    org.springframework.data.domain.Page<GuestDTO> getAllGuests(Pageable pageable);
    void deleteGuest(UUID guestId);
}
