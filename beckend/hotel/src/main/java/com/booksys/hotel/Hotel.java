package com.booksys.hotel;
import com.booksys.employee.Staff;
import com.booksys.feedbackreview.FeedbackReview;
import com.booksys.room.Room;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity representing a Hotel.
 */

@Entity
@Table(name = "hotels")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hotel {

    @Id
    @GeneratedValue
    private UUID id;
    @Column(nullable = false)
    private String name;
    private String address;
    private String phone;
    private String email;
    private String description;
    private Double rating;
    private String imageId;

    @Column(name = "image_name")
    private String imageName;

    private Double latitude;
    private Double longitude;
    private String city;
    private String country;
    private String checkInTime;
    private String checkOutTime;
    private String currency;
    private String timezone;
    private String website;
    private String taxId;
    private String cancellationPolicy;
    private Integer starRating;


    @Builder.Default
    @OneToMany(mappedBy = "hotel", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Room> rooms = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "hotel", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Staff> staff = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "hotel", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FeedbackReview> feedbackReviews = new ArrayList<>();
}