package com.booksys.roomtype;
import jakarta.persistence.Column;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomTypeDTO {
    private UUID id;
    private String name;

    @Column(length = 400)
    private String description;

    private BigDecimal pricePerNight;
    private int capacity;
    private String imageUrl;

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
