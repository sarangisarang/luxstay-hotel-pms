package com.booksys.user;

import io.jsonwebtoken.io.Decoders;

import java.nio.charset.StandardCharsets;

/**
 * Validates the configured JWT signing secret at startup so the application
 * fails fast on a missing or weak secret instead of silently running with an
 * insecure (or publicly known) key.
 *
 * <p>Extracted as a static helper so the rule can be unit-tested without
 * bootstrapping the Spring context.</p>
 */
public final class JwtSecretValidator {

    /** Minimum key length in bytes (32 bytes = 256 bits — the floor for HMAC-SHA). */
    public static final int MIN_SECRET_BYTES = 32;

    private JwtSecretValidator() {
    }

    /**
     * @param secret the raw {@code jwt.secret} value (base64 or plain text)
     * @throws IllegalStateException if the secret is blank or shorter than
     *         {@link #MIN_SECRET_BYTES} bytes once decoded
     */
    public static void validate(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET is required. Set it as an environment variable "
                    + "(generate one with `openssl rand -base64 64`).");
        }

        // Mirror how the secret is consumed when signing: try base64 first,
        // fall back to raw UTF-8 bytes.
        // jjwt's Decoders.BASE64 throws DecodingException (NOT IllegalArgumentException)
        // on non-base64 input, so catch RuntimeException to fall back to raw bytes.
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (RuntimeException notBase64) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }

        if (keyBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET is too weak: " + keyBytes.length + " bytes. "
                    + "Use at least " + MIN_SECRET_BYTES + " bytes (64+ recommended).");
        }
    }
}
