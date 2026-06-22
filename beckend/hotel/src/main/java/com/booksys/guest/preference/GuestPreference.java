package com.booksys.guest.preference;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "guest_preferences")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GuestPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID guestId;

    private String roomFloor;           // e.g. "HIGH", "LOW", "NO_PREFERENCE"
    private String bedType;             // KING, QUEEN, TWIN, NO_PREFERENCE
    private String pillow;              // SOFT, FIRM, NO_PREFERENCE
    private String smokingPreference;   // SMOKING, NON_SMOKING
    private String viewPreference;      // SEA, POOL, GARDEN, CITY, NO_PREFERENCE
    private String dietaryRestrictions; // free text or CSV: VEGETARIAN, VEGAN, HALAL, GLUTEN_FREE
    private String allergies;           // free text

    private Boolean quietRoom;
    private Boolean highFloor;
    private Boolean accessibleRoom;
    private Boolean extraTowels;
    private Boolean extraPillows;
    private Boolean earlyCheckIn;
    private Boolean lateCheckOut;

    @Column(columnDefinition = "TEXT")
    private String specialRequests;

    @Column(columnDefinition = "TEXT")
    private String internalNotes;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
