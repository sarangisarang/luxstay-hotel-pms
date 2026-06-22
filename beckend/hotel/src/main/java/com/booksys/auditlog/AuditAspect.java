package com.booksys.auditlog;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * Cross-cutting AOP aspect that automatically logs every service-layer
 * create / update / delete call into the change_logs table.
 *
 * Intercepts any method in a class whose name ends in "ServiceImpl"
 * whose name starts with create, update, save, delete, cancel,
 * checkIn, checkOut, or toggle.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AuditAspect {

    private final ChangeLogRepository changeLogRepository;

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);

    @Around("execution(* com.booksys..*ServiceImpl.*(..))" +
            " && (execution(* create*(..)) || execution(* update*(..)) " +
            "  || execution(* save*(..))   || execution(* delete*(..)) " +
            "  || execution(* cancel*(..)) || execution(* checkIn*(..)) " +
            "  || execution(* checkOut*(..)) || execution(* toggle*(..)) " +
            "  || execution(* markAsPaid(..)) || execution(* award*(..)) )")
    public Object auditServiceCall(ProceedingJoinPoint pjp) throws Throwable {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        Method method = sig.getMethod();
        String methodName = method.getName();
        String className  = pjp.getTarget().getClass().getSimpleName();

        // Derive entity type from class name: "BookingServiceImpl" → "Booking"
        String entityType = className.replace("ServiceImpl", "");

        // Determine action label
        String action;
        if (methodName.startsWith("create") || methodName.startsWith("save")) action = "CREATE";
        else if (methodName.startsWith("update"))                             action = "UPDATE";
        else if (methodName.startsWith("delete"))                             action = "DELETE";
        else if (methodName.startsWith("cancel"))                             action = "CANCEL";
        else if (methodName.startsWith("checkIn"))                            action = "CHECK_IN";
        else if (methodName.startsWith("checkOut"))                           action = "CHECK_OUT";
        else if (methodName.startsWith("markAsPaid"))                         action = "PAYMENT";
        else if (methodName.startsWith("toggle"))                             action = "TOGGLE";
        else if (methodName.startsWith("award"))                              action = "AWARD_POINTS";
        else                                                                   action = methodName.toUpperCase();

        // Capture serialized args as "before" snapshot
        String argJson = serialize(pjp.getArgs());

        // Execute the actual method
        Object result = pjp.proceed();

        // After successful execution — log to DB asynchronously via try/catch
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String performedBy   = auth != null ? auth.getName() : "SYSTEM";
            String role          = auth != null && auth.getAuthorities() != null
                    ? auth.getAuthorities().stream().findFirst()
                           .map(a -> a.getAuthority().replace("ROLE_", "")).orElse("UNKNOWN")
                    : "UNKNOWN";

            String resultJson = serialize(result);
            String entityId   = extractId(result, pjp.getArgs());
            String summary    = action + " on " + entityType + " by " + performedBy;

            changeLogRepository.save(ChangeLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .performedBy(performedBy)
                    .performedByRole(role)
                    .summary(summary)
                    .oldValue(argJson.length() > 4000 ? argJson.substring(0, 4000) : argJson)
                    .newValue(resultJson.length() > 4000 ? resultJson.substring(0, 4000) : resultJson)
                    .build());
        } catch (Exception ex) {
            log.debug("AuditAspect: could not write change log for {}.{}: {}", className, methodName, ex.getMessage());
        }

        return result;
    }

    private String serialize(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof Object[] arr) {
            if (arr.length == 0) return "[]";
            try { return MAPPER.writeValueAsString(arr); } catch (JsonProcessingException e) { return "[...]"; }
        }
        try { return MAPPER.writeValueAsString(obj); } catch (JsonProcessingException e) { return obj.toString(); }
    }

    private String extractId(Object result, Object[] args) {
        if (result != null) {
            try {
                // Most entities expose getId() which returns UUID
                var getId = result.getClass().getMethod("getId");
                Object id = getId.invoke(result);
                if (id != null) return id.toString();
            } catch (Exception ignored) {}
        }
        // Fall back to first UUID-like arg
        for (Object arg : args) {
            if (arg instanceof java.util.UUID uuid) return uuid.toString();
        }
        return "unknown";
    }
}
