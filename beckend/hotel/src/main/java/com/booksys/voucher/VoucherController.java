package com.booksys.voucher;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class VoucherController {

    private final VoucherRepository repo;
    private final VoucherService voucherService;

    @GetMapping
    public List<Voucher> all() { return repo.findAll(); }

    @GetMapping("/{id}")
    public ResponseEntity<Voucher> getOne(@PathVariable UUID id) {
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Public endpoint: validate a promo code and return the discount.
     * The rules live in {@link VoucherService}, which the price quote and the
     * booking use too, so the discount shown here is the one that gets charged.
     */
    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validate(
            @RequestParam String code,
            @RequestParam(required = false, defaultValue = "0") BigDecimal totalAmount,
            @RequestParam(required = false, defaultValue = "1") int nights,
            @RequestParam(required = false) UUID roomTypeId) {

        VoucherEvaluation result = voucherService.evaluate(code, totalAmount, nights, roomTypeId);
        if (!result.valid()) {
            return ResponseEntity.ok(Map.of("valid", false, "reason", result.reason()));
        }
        Voucher v = result.voucher();
        return ResponseEntity.ok(Map.<String, Object>of(
            "valid",          true,
            "code",           v.getCode(),
            "name",           v.getName(),
            "discountType",   v.getDiscountType().name(),
            "discountValue",  v.getDiscountValue(),
            "discountAmount", result.discount(),
            "description",    v.getDescription() != null ? v.getDescription() : ""
        ));
    }

    @PostMapping
    public ResponseEntity<Voucher> create(@RequestBody Voucher v, Authentication auth) {
        if (v.getUsedCount() == null) v.setUsedCount(0);
        if (v.getActive() == null) v.setActive(true);
        if (auth != null) v.setCreatedBy(auth.getName());
        return ResponseEntity.ok(repo.save(v));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Voucher> update(@PathVariable UUID id, @RequestBody Voucher incoming) {
        return repo.findById(id).map(v -> {
            v.setCode(incoming.getCode());
            v.setName(incoming.getName());
            v.setDiscountType(incoming.getDiscountType());
            v.setDiscountValue(incoming.getDiscountValue());
            v.setMaxDiscountAmount(incoming.getMaxDiscountAmount());
            v.setUsageLimit(incoming.getUsageLimit());
            v.setValidFrom(incoming.getValidFrom());
            v.setValidTo(incoming.getValidTo());
            v.setActive(incoming.getActive());
            v.setHotelId(incoming.getHotelId());
            v.setRoomTypeId(incoming.getRoomTypeId());
            v.setMinNights(incoming.getMinNights());
            v.setDescription(incoming.getDescription());
            return ResponseEntity.ok(repo.save(v));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Voucher> toggle(@PathVariable UUID id) {
        return repo.findById(id).map(v -> {
            v.setActive(!Boolean.TRUE.equals(v.getActive()));
            return ResponseEntity.ok(repo.save(v));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
