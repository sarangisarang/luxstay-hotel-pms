package com.booksys.crm;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface GuestCommunicationRepository extends JpaRepository<GuestCommunication, UUID> {
    List<GuestCommunication> findByGuestIdOrderByContactedAtDesc(UUID guestId);
    List<GuestCommunication> findByGuestEmailOrderByContactedAtDesc(String email);
    List<GuestCommunication> findByType(CommunicationType type);
}
