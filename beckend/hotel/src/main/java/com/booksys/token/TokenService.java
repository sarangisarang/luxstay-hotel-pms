package com.booksys.token;

import com.booksys.user.AppUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for managing persisted JWT tokens.
 *
 * <p>Tokens are stored so that login events can invalidate all previously issued tokens
 * for a user (logout / re-login scenario). Each token records its {@code expired} and
 * {@code revoked} flags so that the filter chain can reject already-logged-out sessions.</p>
 */
@Service
@RequiredArgsConstructor
public class TokenService {

    private final TokenRepository tokenRepository;

    /**
     * Returns all non-expired, non-revoked tokens for the given user.
     *
     * @param user the authenticated user
     * @return list of valid tokens; empty list if none
     */
    public List<Token> getValidTokens(AppUser user) {
        return tokenRepository.findAllByAppUser_IdAndExpiredFalseAndRevokedFalse(user.getId());
    }

    /**
     * Marks all current valid tokens for a user as both expired and revoked.
     * Called before issuing a new token on login to invalidate previous sessions.
     *
     * @param user the user whose tokens should be revoked
     */
    public void revokeAllUserTokens(AppUser user) {
        List<Token> validTokens = getValidTokens(user);
        if (validTokens.isEmpty()) return;

        validTokens.forEach(token -> {
            token.setExpired(true);
            token.setRevoked(true);
        });
        tokenRepository.saveAll(validTokens);
    }

    /**
     * Persists a new JWT token record associated with the given user.
     * The token is initially valid (not expired, not revoked).
     *
     * @param user the user who owns this token
     * @param jwt  the compact JWT string to persist
     */
    public void revokeToken(String jwt) {
        tokenRepository.findByToken(jwt).ifPresent(token -> {
            token.setRevoked(true);
            token.setExpired(true);
            tokenRepository.save(token);
        });
    }

    public void saveUserToken(AppUser user, String jwt) {
        Token token = Token.builder()
                .token(jwt)
                .appUser(user)
                .build();
        tokenRepository.save(token);
    }
}