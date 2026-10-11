package com.booksys.user;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SecurityConfigTest {

    @Test
    void allowedOriginsAreParsedAndSchemeLessHostsBecomeHttps() {
        assertEquals(List.of("https://app.example.com", "http://localhost:3000"),
                SecurityConfig.parseOrigins(" app.example.com , http://localhost:3000/ ,, app.example.com"));
        assertEquals(List.of(), SecurityConfig.parseOrigins(""));
        assertEquals(List.of(), SecurityConfig.parseOrigins(null));
    }
}
