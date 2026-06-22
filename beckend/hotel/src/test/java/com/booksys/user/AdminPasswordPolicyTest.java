package com.booksys.user;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AdminPasswordPolicyTest {

    @Test
    void rejectsNull() {
        assertThatThrownBy(() -> AdminPasswordPolicy.validate(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsBlank() {
        assertThatThrownBy(() -> AdminPasswordPolicy.validate("   "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsTooShort() {
        // 8 chars, has letter + digit but below the 12-char floor.
        assertThatThrownBy(() -> AdminPasswordPolicy.validate("Abc12345"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least");
    }

    @Test
    void rejectsNoDigit() {
        assertThatThrownBy(() -> AdminPasswordPolicy.validate("OnlyLettersHere"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("letter and one digit");
    }

    @Test
    void rejectsNoLetter() {
        assertThatThrownBy(() -> AdminPasswordPolicy.validate("123456789012"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("letter and one digit");
    }

    @Test
    void acceptsStrong() {
        assertThatCode(() -> AdminPasswordPolicy.validate("Str0ngAdminPass"))
                .doesNotThrowAnyException();
    }
}
