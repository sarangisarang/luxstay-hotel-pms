package com.booksys.feedbackreview;
import com.booksys.guest.Guest;
import com.booksys.service.ServiceEntity;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.stream.Collectors;

public interface FeedbackReviewMapper {

    static FeedbackReview toEntity(FeedbackReviewDTO dto, Guest guest) {
        if (dto == null || guest == null) return null;

        FeedbackReview review = FeedbackReview.builder()
                .id(dto.getId() != null ? dto.getId() : UUID.randomUUID())
                .guest(guest)
                .feedbackText(dto.getFeedbackText())
                .rating(dto.getRating())
                .comment(dto.getComment())
                .createdAt(dto.getCreatedAt() != null ? dto.getCreatedAt() : LocalDateTime.now())
                .build();

        return review;
    }

    static FeedbackReviewDTO toDTO(FeedbackReview entity) {
        if (entity == null) return null;

        return FeedbackReviewDTO.builder()
                .id(entity.getId())
                .guestId(entity.getGuest() != null ? entity.getGuest().getId() : null)
                .hotelId(entity.getHotel() != null ? entity.getHotel().getId() : null)
                .hotelName(entity.getHotel() != null ? entity.getHotel().getName() : null)
                .feedbackText(entity.getFeedbackText())
                .rating(entity.getRating())
                .comment(entity.getComment())
                .createdAt(entity.getCreatedAt())
                .serviceIds(entity.getServices() != null
                        ? entity.getServices().stream().map(ServiceEntity::getId).collect(Collectors.toList())
                        : null)
                .build();
    }
}
