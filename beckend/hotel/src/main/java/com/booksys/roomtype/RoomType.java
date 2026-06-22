package com.booksys.roomtype;

import com.booksys.room.Room;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "room_types")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomType {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(length = 400)
    private String description;

    @Column(name = "price_per_night")
    private BigDecimal pricePerNight;

    private int capacity;

    @Builder.Default
    @OneToMany(mappedBy = "roomType", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Room> rooms = new ArrayList<>();

    // --- Basic features ---
    private boolean airConditioning;
    private boolean internet;
    private boolean toilet;
    private boolean bed;
    private boolean tv;
    private boolean balcony;
    private boolean minibar;
    private boolean heating;
    private boolean safe;
    private boolean hairDryer;
    private boolean roomService;

    // --- Extended features ---
    private boolean soundproofing;
    private boolean freeWifi;
    private boolean fitnessCentre;
    private boolean flatScreenTv;
    private boolean facilitiesForDisabledGuests;
    private boolean nonSmokingRoom;
    private boolean shower;
    private boolean towels;
    private boolean linen;
    private boolean telephone;
    private boolean satelliteChannels;
    private boolean desk;
    private boolean wardrobe;
    private boolean cityView;
    private boolean electricKettle;
    private boolean clothesRack;
    private boolean socketNearBed;
    private boolean ironingFacilities;
    private boolean lift;
    private boolean carpeted;
    private boolean wakeUpService;
    private boolean allergyFreeRoom;
    private boolean laptopSafe;
    private boolean upperFloorAccessible;
}


