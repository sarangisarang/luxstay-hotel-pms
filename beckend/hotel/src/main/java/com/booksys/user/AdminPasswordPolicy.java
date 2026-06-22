package com.booksys.user;

/**
 * Minimum strength rule for the bootstrap admin password so the
 * environment-seeded first administrator can never be created with a weak
 * credential. Kept as a static helper to be unit-testable without Spring.
 */
public final class AdminPasswordPolicy {

    /** Minimum length for the bootstrap admin password. */
    public static final int MIN_LENGTH = 12;

    private AdminPasswordPolicy() {
    }

    /**
     * @param password the raw bootstrap password
     * @throws IllegalArgumentException if the password is blank, too short, or
     *         lacks a letter or a digit
     */
    public static void validate(String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException(
                    "ADMIN_BOOTSTRAP_PASSWORD is required to bootstrap an admin.");
        }
        if (password.length() < MIN_LENGTH) {
            throw new IllegalArgumentException(
                    "ADMIN_BOOTSTRAP_PASSWORD is too weak: use at least " + MIN_LENGTH + " characters.");
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new IllegalArgumentException(
                    "ADMIN_BOOTSTRAP_PASSWORD is too weak: include at least one letter and one digit.");
        }
    }
}
