package com.booksys.user;

/**
 * Password rule for every account created or changed through the API
 * (guest registration, password change, staff accounts, password reset).
 * Registration used to accept any password, including "1".
 */
public final class PasswordPolicy {

    /** Minimum length for account passwords. */
    public static final int MIN_LENGTH = 8;

    /** Upper bound so bcrypt (which only uses 72 bytes) is not handed huge input. */
    public static final int MAX_LENGTH = 72;

    private PasswordPolicy() {
    }

    /**
     * @param password the raw password
     * @throws IllegalArgumentException with a user-facing message if the password is too weak
     */
    public static void validate(String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (password.length() < MIN_LENGTH) {
            throw new IllegalArgumentException("Password must be at least " + MIN_LENGTH + " characters long");
        }
        if (password.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Password must be at most " + MAX_LENGTH + " characters long");
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new IllegalArgumentException("Password must contain at least one letter and one digit");
        }
    }
}
