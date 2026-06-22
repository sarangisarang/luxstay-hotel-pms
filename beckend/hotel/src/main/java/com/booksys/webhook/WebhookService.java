package com.booksys.webhook;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class WebhookService {

    private final WebhookSubscriptionRepository subRepo;
    private final WebhookDeliveryRepository     deliveryRepo;
    private final ObjectMapper                  objectMapper;

    /**
     * Fires an event to all active subscribers that match the event name.
     * Runs asynchronously so it never blocks the calling request.
     */
    @Async
    public void fire(String event, Object payload) {
        List<WebhookSubscription> subs = subRepo.findByActiveTrue();
        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            log.error("Webhook serialization failed for event {}: {}", event, e.getMessage());
            return;
        }

        RestTemplate http = new RestTemplate();

        for (WebhookSubscription sub : subs) {
            List<String> subscribed = Arrays.asList(sub.getEvents().split(","));
            if (!subscribed.contains(event)) continue;

            WebhookDelivery delivery = WebhookDelivery.builder()
                    .subscriptionId(sub.getId())
                    .event(event)
                    .payload(json)
                    .build();
            try {
                var headers = new org.springframework.http.HttpHeaders();
                headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
                headers.set("X-Hook-Event", event);
                if (sub.getSecret() != null && !sub.getSecret().isBlank()) {
                    headers.set("X-Hook-Signature", hmacSha256(sub.getSecret(), json));
                }
                var entity = new org.springframework.http.HttpEntity<>(json, headers);
                var response = http.postForEntity(sub.getTargetUrl(), entity, String.class);
                delivery.setStatusCode(response.getStatusCode().value());
            } catch (Exception e) {
                delivery.setStatusCode(0);
                delivery.setError(e.getMessage());
                log.warn("Webhook delivery failed for {} → {}: {}", event, sub.getTargetUrl(), e.getMessage());
            }
            deliveryRepo.save(delivery);
        }
    }

    private String hmacSha256(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return "sha256=" + HexFormat.of().formatHex(raw);
        } catch (Exception e) {
            return "";
        }
    }
}
