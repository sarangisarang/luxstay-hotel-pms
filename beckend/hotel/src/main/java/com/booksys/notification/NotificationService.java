package com.booksys.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repo;

    public void create(String type, String title, String message, String recipientRole) {
        repo.save(AppNotification.builder()
                .type(type)
                .title(title)
                .message(message)
                .recipientRole(recipientRole)
                .build());
    }

    @Transactional
    public void markAllRead() {
        repo.markAllAsRead();
    }
}
