package com.booksys.channel;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChannelListingRepository extends JpaRepository<ChannelListing, UUID> {
    List<ChannelListing> findByChannel(ChannelType channel);
    List<ChannelListing> findByStatus(ChannelStatus status);
    List<ChannelListing> findByRoomTypeId(String roomTypeId);
    long countByChannel(ChannelType channel);
    long countByStatus(ChannelStatus status);
}
