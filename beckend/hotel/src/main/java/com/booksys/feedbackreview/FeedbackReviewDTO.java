package com.booksys.feedbackreview;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackReviewDTO {

    private UUID id;

    private List<UUID> serviceIds;

    @NotNull(message = "Guest ID must not be null")
    private UUID guestId;

    private UUID hotelId;
    private String hotelName;

    @NotBlank(message = "Feedback text must not be blank")
    private String feedbackText;

    @NotNull(message = "Rating must not be null")
    private Integer rating;

    private String comment;

    private LocalDateTime createdAt;
}
