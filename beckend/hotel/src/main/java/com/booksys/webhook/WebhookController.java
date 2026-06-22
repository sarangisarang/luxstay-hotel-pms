package com.booksys.webhook;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class WebhookController {

    private final WebhookSubscriptionRepository subRepo;
    private final WebhookDeliveryRepository     deliveryRepo;
    private final WebhookService                webhookService;

    @GetMapping
    public List<WebhookSubscription> all() {
        return subRepo.findAll();
    }

    @PostMapping
    public ResponseEntity<WebhookSubscription> create(@RequestBody WebhookSubscription sub) {
        sub.setId(null);
        return ResponseEntity.ok(subRepo.save(sub));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<WebhookSubscription> update(
            @PathVariable UUID id, @RequestBody WebhookSubscription patch) {
        return subRepo.findById(id).map(sub -> {
            if (patch.getName()      != null) sub.setName(patch.getName());
            if (patch.getTargetUrl() != null) sub.setTargetUrl(patch.getTargetUrl());
            if (patch.getEvents()    != null) sub.setEvents(patch.getEvents());
            if (patch.getSecret()    != null) sub.setSecret(patch.getSecret());
            sub.setActive(patch.isActive());
            return ResponseEntity.ok(subRepo.save(sub));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        subRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/deliveries")
    public List<WebhookDelivery> deliveries() {
        return deliveryRepo.findTop50ByOrderByDeliveredAtDesc();
    }

    @GetMapping("/{id}/deliveries")
    public List<WebhookDelivery> deliveriesForSub(@PathVariable UUID id) {
        return deliveryRepo.findBySubscriptionIdOrderByDeliveredAtDesc(id);
    }

    /** Test endpoint: fire a ping event to all active subscribers. */
    @PostMapping("/test-ping")
    public ResponseEntity<Map<String, String>> testPing() {
        webhookService.fire("ping", Map.of("message", "Webhook test ping", "timestamp", java.time.Instant.now().toString()));
        return ResponseEntity.ok(Map.of("status", "ping fired"));
    }
}
