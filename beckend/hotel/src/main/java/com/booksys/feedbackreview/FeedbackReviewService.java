package com.booksys.feedbackreview;
import java.util.List;
import java.util.UUID;

public interface FeedbackReviewService {
    List<FeedbackReviewDTO> getAll();
    FeedbackReviewDTO getById(UUID id);
    FeedbackReviewDTO create(FeedbackReviewDTO dto);
    FeedbackReviewDTO update(UUID id, FeedbackReviewDTO dto);
    void delete(UUID id);
}