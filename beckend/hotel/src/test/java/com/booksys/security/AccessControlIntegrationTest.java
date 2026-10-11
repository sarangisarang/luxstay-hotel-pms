package com.booksys.security;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingManageTokens;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingSource;
import com.booksys.booking.BookingStatus;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import com.booksys.hotel.Hotel;
import com.booksys.hotel.HotelRepository;
import com.booksys.payment.PaymentStatus;
import com.booksys.room.Room;
import com.booksys.room.RoomRepository;
import com.booksys.room.RoomStatus;
import com.booksys.roomtype.RoomType;
import com.booksys.roomtype.RoomTypeRepository;
import com.booksys.token.TokenService;
import com.booksys.user.AppUser;
import com.booksys.user.JwtService;
import com.booksys.user.Role;
import com.booksys.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end authorization checks through the real security filter chain with
 * real JWTs: a guest account must only ever reach its own data (the audit
 * found guest accounts reading other guests' profiles, DSGVO exports and
 * bookings), and anonymous callers must not list or cancel bookings by e-mail.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccessControlIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired GuestRepository guests;
    @Autowired HotelRepository hotels;
    @Autowired RoomTypeRepository roomTypes;
    @Autowired RoomRepository rooms;
    @Autowired BookingRepository bookings;
    @Autowired JwtService jwtService;
    @Autowired TokenService tokenService;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired BookingManageTokens manageTokens;

    Guest guestA;
    Guest guestB;
    Booking bookingA;
    Booking bookingB;
    String tokenA;
    String tokenB;
    String receptionToken;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Hotel hotel = new Hotel();
        hotel.setName("Hotel " + suffix);
        hotel.setCurrency("EUR");
        hotel = hotels.save(hotel);

        RoomType type = new RoomType();
        type.setName("Type " + suffix);
        type.setPricePerNight(new BigDecimal("100.00"));
        type.setCapacity(2);
        type = roomTypes.save(type);

        Room room = new Room();
        room.setRoomNumber(ThreadLocalRandom.current().nextInt(10_000, 2_000_000_000));
        room.setRoomStatus(RoomStatus.FREE);
        room.setHotel(hotel);
        room.setRoomType(type);
        room = rooms.save(room);

        AppUser userA = account("anna-" + suffix + "@example.org", Role.USER);
        AppUser userB = account("bert-" + suffix + "@example.org", Role.USER);
        AppUser reception = account("desk-" + suffix + "@example.org", Role.RECEPTION);
        guestA = guestFor(userA, "Anna");
        guestB = guestFor(userB, "Bert");
        bookingA = booking(room, guestA, 10);
        bookingB = booking(room, guestB, 20);

        tokenA = jwtService.generateToken(userA);
        tokenB = jwtService.generateToken(userB);
        receptionToken = jwtService.generateToken(reception);
    }

    /* --------------------------------------------- guest account (USER) */

    @Test
    void guestCannotReadOtherGuestsData() throws Exception {
        as(tokenA, get("/api/guests/" + guestB.getId())).andExpect(status().isForbidden());
        as(tokenA, get("/api/guests/" + guestB.getId() + "/data-export")).andExpect(status().isForbidden());
        as(tokenA, get("/api/guests/" + guestB.getId() + "/preferences")).andExpect(status().isForbidden());
        as(tokenA, get("/api/bookings/guest/" + guestB.getId())).andExpect(status().isForbidden());
        as(tokenA, get("/api/bookings/" + bookingB.getId())).andExpect(status().isForbidden());
    }

    @Test
    void guestCannotReadStaffData() throws Exception {
        as(tokenA, get("/api/vouchers")).andExpect(status().isForbidden());
        as(tokenA, get("/api/housekeeping")).andExpect(status().isForbidden());
        as(tokenA, get("/api/maintenance")).andExpect(status().isForbidden());
        as(tokenA, get("/api/ai/insights/dashboard")).andExpect(status().isForbidden());
        as(tokenA, post("/api/ai/chat").contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"revenue?\"}"))
                .andExpect(status().isForbidden());
        as(tokenA, get("/api/loyalty/email/" + guestB.getEmail())).andExpect(status().isForbidden());
        as(tokenA, get("/api/rooms/availability")).andExpect(status().isForbidden());
    }

    @Test
    void guestSeesAndCancelsOnlyOwnBookings() throws Exception {
        as(tokenA, get("/api/user/bookings"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(bookingA.getId().toString())))
                .andExpect(content().string(not(containsString(bookingB.getId().toString()))));

        as(tokenA, post("/api/user/bookings/" + bookingB.getId() + "/cancel")).andExpect(status().isNotFound());
        as(tokenB, get("/api/user/bookings"))
                .andExpect(content().string(containsString("CONFIRMED")));

        as(tokenA, post("/api/user/bookings/" + bookingA.getId() + "/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void guestExportContainsOnlyOwnData() throws Exception {
        as(tokenA, get("/api/user/data-export"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(guestA.getEmail())))
                .andExpect(content().string(not(containsString(guestB.getEmail()))));
    }

    @Test
    void chatHistoryOnlyForOwnBooking() throws Exception {
        as(tokenA, get("/api/chat/" + bookingA.getId() + "/messages")).andExpect(status().isOk());
        as(tokenA, get("/api/chat/" + bookingB.getId() + "/messages")).andExpect(status().isNotFound());
        as(tokenA, post("/api/chat/start").contentType(MediaType.APPLICATION_JSON).content("{\"userB\":\"x\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffStillHasAccess() throws Exception {
        as(receptionToken, get("/api/guests/" + guestB.getId())).andExpect(status().isOk());
        as(receptionToken, get("/api/chat/" + bookingB.getId() + "/messages")).andExpect(status().isOk());
        // staff accounts have no guest profile
        as(receptionToken, get("/api/user/bookings")).andExpect(status().isForbidden());
    }

    @Test
    void revokedTokenIsRejected() throws Exception {
        String token = jwtService.generateToken(users.findByEmail(guestA.getEmail()).orElseThrow());
        tokenService.saveUserToken(users.findByEmail(guestA.getEmail()).orElseThrow(), token);
        as(token, get("/api/user/bookings")).andExpect(status().isOk());
        tokenService.revokeToken(token);
        as(token, get("/api/user/bookings")).andExpect(status().isUnauthorized());
        // a stale token does not break public pages
        as(token, get("/api/public/bookings/options")).andExpect(status().isOk());
    }

    /* ------------------------------------------------------- anonymous */

    @Test
    void emailOnlyEndpointsAreGone() throws Exception {
        mvc.perform(get("/api/public/bookings/my-bookings").param("email", guestA.getEmail()))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/public/bookings/" + bookingA.getId() + "/cancel").param("email", guestA.getEmail()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/user/bookings")).andExpect(status().isUnauthorized());
    }

    @Test
    void manageLinkTokenCoversOnlyItsBookings() throws Exception {
        String bookingToken = manageTokens.forBooking(bookingB.getId(), Instant.now().plus(Duration.ofDays(1)));
        mvc.perform(get("/api/public/bookings/manage").header("X-Booking-Token", bookingToken))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(bookingB.getId().toString())))
                .andExpect(content().string(not(containsString(bookingA.getId().toString()))));
        // the token for booking B cannot cancel booking A
        mvc.perform(post("/api/public/bookings/manage/" + bookingA.getId() + "/cancel")
                        .header("X-Booking-Token", bookingToken))
                .andExpect(status().isNotFound());

        String emailToken = manageTokens.forEmail(guestA.getEmail(), Duration.ofHours(1));
        mvc.perform(get("/api/public/bookings/manage").header("X-Booking-Token", emailToken))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(bookingA.getId().toString())))
                .andExpect(content().string(not(containsString(bookingB.getId().toString()))));

        String forged = bookingToken.substring(0, bookingToken.length() - 2) + "xx";
        mvc.perform(get("/api/public/bookings/manage").header("X-Booking-Token", forged))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/public/bookings/manage")).andExpect(status().isUnauthorized());
    }

    @Test
    void requestLinkAnswersTheSameForUnknownAddresses() throws Exception {
        String known = mvc.perform(post("/api/public/bookings/manage/request-link")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"" + guestA.getEmail() + "\"}"))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        String unknown = mvc.perform(post("/api/public/bookings/manage/request-link")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"nobody-" + UUID.randomUUID() + "@example.org\"}"))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(known, unknown);
    }

    @Test
    void wrongPasswordIs401AndWeakPasswordIs400() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + guestA.getEmail() + "\",\"password\":\"wrong-pass-1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid email or password"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"new-" + UUID.randomUUID() + "@example.org\",\"password\":\"1\","
                                + "\"firstName\":\"N\",\"lastName\":\"N\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void errorResponsesDoNotLeakInternals() throws Exception {
        as(receptionToken, get("/api/guests/not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid value for 'id'"));
        as(receptionToken, post("/api/guests").contentType(MediaType.APPLICATION_JSON).content("{broken"))
                .andExpect(status().isBadRequest());
    }

    /* --------------------------------------------------------- helpers */

    private ResultActions as(String token, MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + token));
    }

    private AppUser account(String email, Role role) {
        return users.save(AppUser.builder()
                .email(email)
                .password(passwordEncoder.encode("Secret-pass-123"))
                .role(role)
                .build());
    }

    private Guest guestFor(AppUser user, String firstName) {
        Guest g = new Guest();
        g.setFirstName(firstName);
        g.setLastName("Tester");
        g.setEmail(user.getEmail());
        g.setAppUser(user);
        return guests.save(g);
    }

    private Booking booking(Room room, Guest guest, int daysAhead) {
        Booking b = new Booking();
        b.setRoom(room);
        b.setRoomNumber(room.getRoomNumber());
        b.setGuest(guest);
        b.setGuestName(guest.getFirstName() + " " + guest.getLastName());
        b.setCheckInDate(LocalDate.now().plusDays(daysAhead));
        b.setCheckOutDate(LocalDate.now().plusDays(daysAhead + 2));
        b.setTotalAmount(new BigDecimal("200.00"));
        b.setBookingStatus(BookingStatus.CONFIRMED);
        b.setPaymentStatus(PaymentStatus.PENDING);
        b.setBookingSource(BookingSource.DIRECT_WEBSITE);
        return bookings.save(b);
    }
}
