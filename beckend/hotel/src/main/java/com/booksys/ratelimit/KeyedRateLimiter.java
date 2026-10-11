package com.booksys.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.local.LocalBucketBuilder;

import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Token buckets per key (IP address, e-mail, ...) in a size-bounded LRU map,
 * so a flood of distinct keys cannot grow memory without limit (the previous
 * maps were unbounded).
 */
public class KeyedRateLimiter {

    /** One limit: {@code capacity} requests per {@code period}. */
    public record Limit(long capacity, Duration period) {}

    private final Limit[] limits;
    private final Map<String, Bucket> buckets;

    public KeyedRateLimiter(int maxKeys, Limit... limits) {
        if (limits.length == 0) throw new IllegalArgumentException("At least one limit is required");
        this.limits = limits.clone();
        this.buckets = Collections.synchronizedMap(new LinkedHashMap<>(256, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
                return size() > maxKeys;
            }
        });
    }

    /** @return {@code true} if the request for this key is allowed (and counts it) */
    public boolean tryAcquire(String key) {
        return buckets.computeIfAbsent(key == null ? "" : key, k -> newBucket()).tryConsume(1);
    }

    private Bucket newBucket() {
        LocalBucketBuilder builder = Bucket.builder();
        for (Limit l : limits) {
            builder.addLimit(Bandwidth.builder().capacity(l.capacity()).refillGreedy(l.capacity(), l.period()).build());
        }
        return builder.build();
    }
}
