package com.booksys.loyalty;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GuestLoyaltyRepository extends JpaRepository<GuestLoyalty, UUID> {

    Optional<GuestLoyalty> findByGuestId(UUID guestId);

    Optional<GuestLoyalty> findByGuestEmail(String email);

    List<GuestLoyalty> findByTier(LoyaltyTier tier);

    @Query("SELECT g FROM GuestLoyalty g ORDER BY g.points DESC")
    List<GuestLoyalty> findTopMembers();

    long countByTier(LoyaltyTier tier);
}
