package com.booksys.booking;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Every five minutes, releases rooms that were held for an online payment
 * which never completed (see {@link OnlineBookingService#expireStaleStripeHolds()}).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OnlineHoldExpiryJob {

    private final OnlineBookingService onlineBookingService;

    @Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT1M")
    public void releaseExpiredHolds() {
        try {
            int released = onlineBookingService.expireStaleStripeHolds();
            if (released > 0) {
                log.info("Released {} expired online booking hold(s)", released);
            }
        } catch (Exception e) {
            log.error("Online hold expiry run failed: {}", e.getMessage(), e);
        }
    }
}
