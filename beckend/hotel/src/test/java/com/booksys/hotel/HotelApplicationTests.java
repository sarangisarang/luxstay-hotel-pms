package com.booksys.hotel;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class HotelApplicationTests {

    @Test
    void contextLoads() {
        // Verifies the full Spring application context starts without errors.
        // Uses H2 in-memory DB (application-test.properties) — no PostgreSQL required.
    }
}
