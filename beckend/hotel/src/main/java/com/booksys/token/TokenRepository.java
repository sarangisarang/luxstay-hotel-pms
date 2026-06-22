package com.booksys.token;


import org.springframework.data.jpa.repository.JpaRepository;


import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TokenRepository extends JpaRepository<Token, UUID> {

    List<Token> findAllByAppUser_IdAndExpiredFalseAndRevokedFalse(UUID userId);
    Optional<Token> findByToken(String token);
    boolean existsByTokenAndRevokedTrue(String token);
    boolean existsByTokenAndExpiredTrue(String token);
}
