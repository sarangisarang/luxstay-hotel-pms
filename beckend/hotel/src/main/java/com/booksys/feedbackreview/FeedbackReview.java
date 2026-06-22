package com.booksys.feedbackreview;
import com.booksys.guest.Guest;
import com.booksys.hotel.Hotel;
import com.booksys.service.ServiceEntity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name ="feedback_review")
public class FeedbackReview {

    @Id
    @GeneratedValue
    private UUID id;

    private String feedbackText;

    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;


    @ManyToOne
    @JoinColumn(name = "guest_id")
    private Guest guest;

    @ManyToOne
    @JoinColumn(name = "hotel_id")
    private Hotel hotel;

    @ManyToMany
    @JoinTable(
            name = "feedback_review_services",
            joinColumns = @JoinColumn(name = "feedback_id"),
            inverseJoinColumns = @JoinColumn(name = "service_id")
    )
    private List<ServiceEntity> services;
}
