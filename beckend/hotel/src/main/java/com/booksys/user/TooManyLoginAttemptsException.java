package com.booksys.user;

/** Thrown when an account is temporarily blocked after too many wrong passwords (HTTP 429). */
public class TooManyLoginAttemptsException extends RuntimeException {
    public TooManyLoginAttemptsException() {
        super("Too many failed login attempts. Please wait 15 minutes and try again.");
    }
}
