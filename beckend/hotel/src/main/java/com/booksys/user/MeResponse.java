package com.booksys.user;
import java.util.UUID;

 public record MeResponse (
     // Safe response for /api/auth/me (no password, no recursion)
             UUID id,
             String email,
             String role,
             UUID guestId,
             UUID staffId
){}
