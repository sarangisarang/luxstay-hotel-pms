package com.booksys.exception;

import com.booksys.user.TooManyLoginAttemptsException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Centralized exception handler for all REST controllers.
 *
 * <p>Responses always have the shape {@code {"error": "..."}}. Messages from
 * deliberate business exceptions (IllegalArgument/IllegalState, not-found) are
 * returned as they are; everything unexpected is logged with a short reference
 * and answered with a generic text, so SQL statements, constraint names and
 * stack details never reach the client (they used to).
 *
 * <ul>
 *   <li>EntityNotFoundException / NoSuchElementException → 404</li>
 *   <li>IllegalArgumentException, validation, malformed JSON, bad parameter → 400</li>
 *   <li>AuthenticationException (wrong password etc.) → 401 (was 500)</li>
 *   <li>AccessDeniedException → 403</li>
 *   <li>IllegalStateException, integrity / optimistic-lock conflicts → 409</li>
 *   <li>Too large upload → 413, too many login attempts → 429</li>
 *   <li>Anything else → 500 with a generic message</li>
 * </ul>
 */
@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationErrors(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult().getFieldErrors()
                .stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return error(HttpStatus.BAD_REQUEST, errors.isBlank() ? "Invalid request" : errors);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> handleConstraintViolation(ConstraintViolationException ex) {
        String errors = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining(", "));
        return error(HttpStatus.BAD_REQUEST, errors.isBlank() ? "Invalid request" : errors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadable(HttpMessageNotReadableException ex) {
        return error(HttpStatus.BAD_REQUEST, "The request body is missing or is not valid JSON");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return error(HttpStatus.BAD_REQUEST, "Invalid value for '" + ex.getName() + "'");
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(EntityNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, messageOr(ex, "Resource not found"));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleNoSuchElement(NoSuchElementException ex) {
        return error(HttpStatus.NOT_FOUND, messageOr(ex, "Resource not found"));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, String>> handleAuthentication(AuthenticationException ex) {
        // One message for unknown e-mail, wrong password and disabled account,
        // so the response does not reveal which accounts exist.
        return error(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }

    @ExceptionHandler(TooManyLoginAttemptsException.class)
    public ResponseEntity<Map<String, String>> handleTooManyLogins(TooManyLoginAttemptsException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", "900")
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, messageOr(ex, "Invalid request"));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleConflict(IllegalStateException ex) {
        return error(HttpStatus.CONFLICT, messageOr(ex, "The request conflicts with the current state"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleIntegrity(DataIntegrityViolationException ex) {
        // The database message names tables, columns and values: log it, do not return it
        String ref = reference();
        log.warn("Data integrity violation [ref {}]: {}", ref, ex.getMostSpecificCause().getMessage());
        return error(HttpStatus.CONFLICT,
                "This change conflicts with existing data (duplicate value or record still in use). Ref: " + ref);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, String>> handleOptimisticLock(OptimisticLockingFailureException ex) {
        return error(HttpStatus.CONFLICT, "The record was changed by someone else. Please reload and try again.");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleUploadTooLarge(MaxUploadSizeExceededException ex) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, "The file is too large");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        HttpStatusCode status = ex.getStatusCode();
        String reason = ex.getReason() != null ? ex.getReason() : defaultText(status);
        return error(status, reason);
    }

    @ExceptionHandler(ErrorResponseException.class)
    public ResponseEntity<Map<String, String>> handleErrorResponse(ErrorResponseException ex) {
        HttpStatusCode status = ex.getStatusCode();
        String detail = ex.getBody().getDetail();
        return error(status, status.is5xxServerError() || detail == null ? defaultText(status) : detail);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        // Exceptions annotated with @ResponseStatus (e.g. GuestNotFoundException → 404)
        // keep their status; this generic handler used to turn them into 500.
        ResponseStatus annotated = AnnotatedElementUtils.findMergedAnnotation(ex.getClass(), ResponseStatus.class);
        if (annotated != null && annotated.code() != HttpStatus.INTERNAL_SERVER_ERROR) {
            String reason = !annotated.reason().isBlank() ? annotated.reason() : messageOr(ex, defaultText(annotated.code()));
            return error(annotated.code(), reason);
        }
        String ref = reference();
        log.error("Unhandled exception [ref {}]", ref, ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error. Ref: " + ref);
    }

    /* ---------------------------------------------------------------------- */

    private static ResponseEntity<Map<String, String>> error(HttpStatusCode status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }

    private static String messageOr(Throwable ex, String fallback) {
        String msg = ex.getMessage();
        return msg == null || msg.isBlank() ? fallback : msg;
    }

    private static String defaultText(HttpStatusCode status) {
        HttpStatus known = HttpStatus.resolve(status.value());
        return known != null ? known.getReasonPhrase() : "Error";
    }

    /** Short id that appears in the response and in the log line, for support requests. */
    private static String reference() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
