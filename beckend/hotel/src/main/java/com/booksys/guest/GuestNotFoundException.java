package com.booksys.guest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Exception thrown when a guest is not found in the system.
 */
@ResponseStatus(value = HttpStatus.NOT_FOUND)
public class GuestNotFoundException extends RuntimeException {

    public GuestNotFoundException(String message) {
        super(message);
    }
}
