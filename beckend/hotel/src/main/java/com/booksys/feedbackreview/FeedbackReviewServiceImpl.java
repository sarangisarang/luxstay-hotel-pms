package com.booksys.feedbackreview;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Default implementation of {@link FeedbackReviewService}.
 *
 * Manages guest feedback and star ratings for hotel stays. When a review is created,
 * the associated hotel is resolved from the guest's most recent booking so the review
 * is linked to the correct property. The {@code comment} field mirrors {@code feedbackText}
 * for backward compatibility with older API consumers.
 */
@Service
@RequiredArgsConstructor
public class FeedbackReviewServiceImpl implements FeedbackReviewService {

    private final FeedbackReviewRepository feedbackReviewRepository;
    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;

    @Override
    public List<FeedbackReviewDTO> getAll() {
        return feedbackReviewRepository.findAll()
                .stream()
                .map(FeedbackReviewMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public FeedbackReviewDTO getById(UUID id) {
        FeedbackReview entity = feedbackReviewRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("FeedbackReview not found: " + id));
        return FeedbackReviewMapper.toDTO(entity);
    }

    /**
     * Creates a new feedback review. The hotel association is resolved from the guest's
     * most recent booking (latest check-in date). The guest must have at least one booking.
     */
    @Override
    public FeedbackReviewDTO create(FeedbackReviewDTO dto) {
        Guest guest = guestRepository.findById(dto.getGuestId())
                .orElseThrow(() -> new EntityNotFoundException("Guest not found: " + dto.getGuestId()));

        List<Booking> guestBookings = bookingRepository.findTopByGuestOrderByCheckInDateDesc(guest);
        if (guestBookings.isEmpty()) {
            throw new IllegalStateException("No booking found for guest: " + guest.getId());
        }

        Booking latestBooking = guestBookings.get(0);

        FeedbackReview entity = FeedbackReviewMapper.toEntity(dto, guest);

        if (latestBooking.getRoom() != null) {
            entity.setHotel(latestBooking.getRoom().getHotel());
        }

        entity.setComment(entity.getFeedbackText());

        if (latestBooking.getServices() != null && !latestBooking.getServices().isEmpty()) {
            entity.setServices(latestBooking.getServices());
        }

        return FeedbackReviewMapper.toDTO(feedbackReviewRepository.save(entity));
    }

    /**
     * Updates an existing review's text, rating, and guest association.
     * The hotel link is re-resolved from the guest's latest booking.
     * createdAt is never overwritten — it records when the review was first submitted.
     */
    @Override
    public FeedbackReviewDTO update(UUID id, FeedbackReviewDTO dto) {
        FeedbackReview existing = feedbackReviewRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("FeedbackReview not found: " + id));

        Guest guest = guestRepository.findById(dto.getGuestId())
                .orElseThrow(() -> new EntityNotFoundException("Guest not found: " + dto.getGuestId()));

        existing.setFeedbackText(dto.getFeedbackText());
        existing.setRating(dto.getRating());
        existing.setGuest(guest);
        existing.setComment(dto.getFeedbackText());

        bookingRepository.findTopByGuestIdOrderByCheckInDateDesc(guest.getId())
                .ifPresent(b -> {
                    if (b.getRoom() != null) existing.setHotel(b.getRoom().getHotel());
                });

        // createdAt is intentionally NOT updated — it is immutable after creation

        return FeedbackReviewMapper.toDTO(feedbackReviewRepository.save(existing));
    }

    @Override
    public void delete(UUID id) {
        if (!feedbackReviewRepository.existsById(id)) {
            throw new EntityNotFoundException("FeedbackReview not found: " + id);
        }
        feedbackReviewRepository.deleteById(id);
    }
}
