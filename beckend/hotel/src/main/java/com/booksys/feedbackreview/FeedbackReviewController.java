package com.booksys.feedbackreview;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@SuppressWarnings("null")
@RestController
@RequestMapping("/api/feedback-reviews")
@RequiredArgsConstructor
public class FeedbackReviewController {

    private final FeedbackReviewService feedbackReviewService;
    private final com.booksys.user.CurrentUser currentUser;

    @GetMapping
    public ResponseEntity<List<FeedbackReviewDTO>> getAll() {
        return ResponseEntity.ok(feedbackReviewService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FeedbackReviewDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(feedbackReviewService.getById(id));
    }

    /**
     * Staff may record a review for any guest; a guest account always reviews
     * as itself (the guest ID from the request is ignored), and only after a
     * stay (the service requires a booking).
     */
    @PostMapping
    public ResponseEntity<FeedbackReviewDTO> create(@RequestBody FeedbackReviewDTO dto) {
        if (!currentUser.isStaff()) {
            dto.setGuestId(currentUser.requireGuest().getId());
        }
        if (dto.getGuestId() == null) {
            throw new IllegalArgumentException("Guest ID must not be null");
        }
        if (dto.getFeedbackText() == null || dto.getFeedbackText().isBlank()) {
            throw new IllegalArgumentException("Feedback text must not be blank");
        }
        if (dto.getFeedbackText().length() > 2000 || (dto.getComment() != null && dto.getComment().length() > 2000)) {
            throw new IllegalArgumentException("Feedback must be at most 2000 characters");
        }
        if (dto.getRating() == null || dto.getRating() < 1 || dto.getRating() > 10) {
            throw new IllegalArgumentException("Rating must be between 1 and 10");
        }
        return ResponseEntity.ok(feedbackReviewService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FeedbackReviewDTO> update(@PathVariable UUID id, @Valid @RequestBody FeedbackReviewDTO dto) {
        return ResponseEntity.ok(feedbackReviewService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        feedbackReviewService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        List<FeedbackReviewDTO> all = feedbackReviewService.getAll();
        long total = all.size();

        Map<Integer, Long> dist = all.stream()
                .filter(r -> r.getRating() != null)
                .collect(Collectors.groupingBy(FeedbackReviewDTO::getRating, Collectors.counting()));

        java.util.OptionalDouble avg = all.stream()
                .filter(r -> r.getRating() != null)
                .mapToInt(FeedbackReviewDTO::getRating)
                .average();
        BigDecimal averageRating = avg.isPresent()
                ? BigDecimal.valueOf(avg.getAsDouble()).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long positive = all.stream().filter(r -> r.getRating() != null && r.getRating() >= 4).count();
        long negative = all.stream().filter(r -> r.getRating() != null && r.getRating() <= 2).count();
        BigDecimal satisfaction = total > 0
                ? BigDecimal.valueOf(positive * 100.0 / total).setScale(1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total",          total);
        result.put("averageRating",  averageRating);
        result.put("satisfaction",   satisfaction);
        result.put("positive",       positive);
        result.put("negative",       negative);
        result.put("distribution",   dist);
        return ResponseEntity.ok(result);
    }
}