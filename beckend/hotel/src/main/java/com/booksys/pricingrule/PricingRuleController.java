package com.booksys.pricingrule;

import com.booksys.pricing.DynamicPricingService;
import com.booksys.roomtype.RoomType;
import com.booksys.roomtype.RoomTypeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@SuppressWarnings("null")
@RestController
@RequestMapping("/api/pricing-rules")
@RequiredArgsConstructor
public class PricingRuleController {

    private final PricingRuleRepository repo;
    private final RoomTypeRepository roomTypeRepository;
    private final DynamicPricingService dynamicPricingService;

    @GetMapping
    public List<PricingRule> getAll() {
        return repo.findAll();
    }

    @GetMapping("/active")
    public List<PricingRule> getActive() {
        return repo.findByActiveOrderByPriorityDesc(true);
    }

    @PostMapping
    public PricingRule create(@RequestBody PricingRule rule) {
        rule.setId(null);
        if (rule.getActive() == null) rule.setActive(true);
        if (rule.getPriority() == null) rule.setPriority(10);
        return repo.save(rule);
    }

    @PutMapping("/{id}")
    public PricingRule update(@PathVariable UUID id, @RequestBody PricingRule body) {
        PricingRule r = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
        if (body.getName() != null) r.setName(body.getName());
        if (body.getType() != null) r.setType(body.getType());
        if (body.getDescription() != null) r.setDescription(body.getDescription());
        if (body.getActive() != null) r.setActive(body.getActive());
        if (body.getPriority() != null) r.setPriority(body.getPriority());
        if (body.getAdjustmentPercent() != null) r.setAdjustmentPercent(body.getAdjustmentPercent());
        if (body.getAdjustmentFixed() != null) r.setAdjustmentFixed(body.getAdjustmentFixed());
        if (body.getValidFrom() != null) r.setValidFrom(body.getValidFrom());
        if (body.getValidTo() != null) r.setValidTo(body.getValidTo());
        if (body.getConditionMinNights() != null) r.setConditionMinNights(body.getConditionMinNights());
        if (body.getConditionDaysBeforeArrival() != null) r.setConditionDaysBeforeArrival(body.getConditionDaysBeforeArrival());
        if (body.getConditionOccupancyPctMin() != null) r.setConditionOccupancyPctMin(body.getConditionOccupancyPctMin());
        if (body.getConditionOccupancyPctMax() != null) r.setConditionOccupancyPctMax(body.getConditionOccupancyPctMax());
        return repo.save(r);
    }

    @PatchMapping("/{id}/toggle")
    public PricingRule toggle(@PathVariable UUID id) {
        PricingRule r = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
        r.setActive(!Boolean.TRUE.equals(r.getActive()));
        return repo.save(r);
    }

    @GetMapping("/simulate")
    public ResponseEntity<?> simulate(
            @RequestParam BigDecimal baseRate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam int nights) {

        List<PricingRule> rules = repo.findActiveForDate(checkIn);
        BigDecimal adjusted = baseRate;

        for (PricingRule rule : rules) {
            if (rule.getAdjustmentPercent() != null) {
                adjusted = adjusted.multiply(
                        BigDecimal.ONE.add(rule.getAdjustmentPercent().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
                );
            }
            if (rule.getAdjustmentFixed() != null) {
                adjusted = adjusted.add(rule.getAdjustmentFixed());
            }
        }

        BigDecimal total = adjusted.multiply(BigDecimal.valueOf(nights)).setScale(2, RoundingMode.HALF_UP);
        adjusted = adjusted.setScale(2, RoundingMode.HALF_UP);

        return ResponseEntity.ok(Map.of(
                "baseRate",     baseRate,
                "adjustedRate", adjusted,
                "nights",       nights,
                "totalAmount",  total,
                "rulesApplied", rules.stream().map(PricingRule::getName).toList()
        ));
    }

    /**
     * Returns per-day effective rates for all room types over a date range.
     * Used to power the pricing calendar heatmap.
     * Max range: 90 days.
     */
    @GetMapping("/calendar")
    public List<Map<String, Object>> calendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        if (from.isAfter(to)) return List.of();
        LocalDate cap = from.plusDays(90);
        LocalDate end = to.isAfter(cap) ? cap : to;

        List<RoomType> roomTypes = roomTypeRepository.findAll().stream()
                .filter(rt -> rt.getPricePerNight() != null)
                .toList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(end); day = day.plusDays(1)) {
            List<PricingRule> rules = repo.findActiveForDate(day);
            List<Map<String, Object>> rates = new ArrayList<>();
            for (RoomType rt : roomTypes) {
                BigDecimal base = rt.getPricePerNight();
                BigDecimal effective = dynamicPricingService.nightlyPrice(base, day);
                // Apply admin pricing rules
                for (PricingRule rule : rules) {
                    if (rule.getAdjustmentPercent() != null) {
                        effective = effective.multiply(
                            BigDecimal.ONE.add(rule.getAdjustmentPercent().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
                        );
                    }
                    if (rule.getAdjustmentFixed() != null) {
                        effective = effective.add(rule.getAdjustmentFixed());
                    }
                }
                Map<String, Object> rateMap = new LinkedHashMap<>();
                rateMap.put("roomTypeId",   rt.getId());
                rateMap.put("roomTypeName", rt.getName());
                rateMap.put("baseRate",     base);
                rateMap.put("effectiveRate", effective.setScale(2, RoundingMode.HALF_UP));
                rates.add(rateMap);
            }
            Map<String, Object> day_map = new LinkedHashMap<>();
            day_map.put("date", day.toString());
            day_map.put("dayOfWeek", day.getDayOfWeek().toString().substring(0, 3));
            day_map.put("rates", rates);
            result.add(day_map);
        }
        return result;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Quick promotional rule: create a percent-off rule for a date range in one call.
     * Used by the Revenue Optimizer to apply suggested discounts instantly.
     */
    @PostMapping("/quick-promo")
    public PricingRule quickPromo(@RequestBody QuickPromoRequest req) {
        PricingRule rule = PricingRule.builder()
                .name(req.name() != null ? req.name() : "Promo " + req.from() + " → " + req.to())
                .type(PricingRuleType.SEASONAL)
                .description("Auto-created promotional discount: " + Math.abs(req.discountPct()) + "% off")
                .active(true)
                .priority(50)
                .adjustmentPercent(java.math.BigDecimal.valueOf(-Math.abs(req.discountPct())))
                .validFrom(req.from())
                .validTo(req.to())
                .build();
        return repo.save(rule);
    }

    public record QuickPromoRequest(
        String name,
        @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate from,
        @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate to,
        double discountPct
    ) {}
}
