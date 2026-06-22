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

    @GetMapping
    public ResponseEntity<List<FeedbackReviewDTO>> getAll() {
        return ResponseEntity.ok(feedbackReviewService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FeedbackReviewDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(feedbackReviewService.getById(id));
    }

    @PostMapping
    public ResponseEntity<FeedbackReviewDTO> create(@Valid @RequestBody FeedbackReviewDTO dto) {
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