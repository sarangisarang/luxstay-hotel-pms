package com.booksys.room;

import com.booksys.booking.Booking;
import com.booksys.hotel.Hotel;
import com.booksys.roomtype.RoomType;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "room")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @EqualsAndHashCode.Include
    @ToString.Include
    private UUID id;

    private String imageUrl;
    private String floor;

    @ToString.Include
    private BigDecimal price;

    private String description;
    private String hotelName;

    @Column(name = "room_number", nullable = false, unique = true)
    @ToString.Include
    private Integer roomNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_status", nullable = false)
    @ToString.Include
    private RoomStatus roomStatus;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hotel_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Hotel hotel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private RoomType roomType;

    // ბიდირექციული მხარე — არ შევიყვანოთ toString/equals-ში; JSON-ში ვმართავთ ლინკს
    @Builder.Default
    @OneToMany(mappedBy = "room", fetch = FetchType.LAZY) // cascade არ ვუთითებთ — უსაფრთხო დეფოლტი
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @JsonManagedReference("room-bookings")
    private List<Booking> bookings = new ArrayList<>();
}
