package com.booksys.chat;


import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findByBookingIdOrderBySentAtAsc(UUID bookingId);
}

