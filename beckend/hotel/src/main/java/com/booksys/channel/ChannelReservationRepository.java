package com.booksys.channel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChannelReservationRepository extends JpaRepository<ChannelReservation, UUID> {
    List<ChannelReservation> findByChannel(ChannelType channel);
    List<ChannelReservation> findByStatus(String status);
    Optional<ChannelReservation> findByExternalReservationId(String externalId);
    List<ChannelReservation> findAllByOrderByReceivedAtDesc();

    @org.springframework.data.jpa.repository.Query(
        "SELECT COALESCE(SUM(r.commissionAmount), 0) FROM ChannelReservation r WHERE r.commissionAmount IS NOT NULL")
    java.math.BigDecimal sumCommissions();
}
