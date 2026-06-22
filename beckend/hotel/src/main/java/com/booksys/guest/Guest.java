package com.booksys.guest;

import com.booksys.booking.Booking;
import com.booksys.feedbackreview.FeedbackReview;
import com.booksys.servicerequest.ServiceRequest;
import com.booksys.user.AppUser;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "guest")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Guest {

    @Id
    @GeneratedValue
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    @ToString.Include
    private String firstName;

    @ToString.Include
    private String lastName;

    private String email;
    private String phone;
    private String address;
    private String country;
    private String nationality;
    private String passportNumber;
    private LocalDate birthDate;

    // Bidirectional collections — არ ჩავრთოთ toString/equals-ში
    @OneToMany(mappedBy = "guest", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @JsonManagedReference("guest-bookings")
    private List<Booking> bookings;

    @OneToMany(mappedBy = "guest", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ServiceRequest> serviceRequests;

    @OneToMany(mappedBy = "guest", fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<FeedbackReview> feedbackReviews;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id",unique = true)
    @JsonIgnore
    private AppUser appUser;
}
