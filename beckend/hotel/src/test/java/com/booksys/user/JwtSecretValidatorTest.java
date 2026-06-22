package com.booksys.user;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pins the JWT secret strength rule: the app must refuse to start on a missing
 * or weak secret, and accept a strong one.
 */
class JwtSecretValidatorTest {

    @Test
    void rejectsNullSecret() {
        assertThatThrownBy(() -> JwtSecretValidator.validate(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("required");
    }

    @Test
    void rejectsBlankSecret() {
        assertThatThrownBy(() -> JwtSecretValidator.validate("   "))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("required");
    }

    @Test
    void rejectsShortSecret() {
        assertThatThrownBy(() -> JwtSecretValidator.validate("short-secret"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("too weak");
    }

    @Test
    void acceptsStrongPlainTextSecret() {
        // 50 plain chars → 50 UTF-8 bytes, well above the 32-byte floor.
        assertThatCode(() -> JwtSecretValidator.validate(
                "this-is-a-strong-jwt-secret-with-plenty-of-entropy"))
                .doesNotThrowAnyException();
    }

    @Test
    void acceptsStrongBase64Secret() {
        // base64 of a 48-byte key.
        assertThatCode(() -> JwtSecretValidator.validate(
                "dGVzdC1zZWNyZXQta2V5LWZvci11bml0LXRlc3RzLW9ubHktbm90LXByb2Q="))
                .doesNotThrowAnyException();
    }
}
