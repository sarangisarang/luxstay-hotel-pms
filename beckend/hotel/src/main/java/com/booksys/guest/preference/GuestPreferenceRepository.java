package com.booksys.guest.preference;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface GuestPreferenceRepository extends JpaRepository<GuestPreference, UUID> {
    Optional<GuestPreference> findByGuestId(UUID guestId);
}
