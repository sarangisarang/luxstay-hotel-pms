package com.booksys.rateplan;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rate-plans")
@RequiredArgsConstructor
public class RatePlanController {

    private final RatePlanRepository repo;

    @GetMapping
    public List<RatePlan> getAll() {
        return repo.findAll();
    }

    @GetMapping("/active")
    public List<RatePlan> getActive() {
        return repo.findByActive(true);
    }

    @GetMapping("/applicable")
    public List<RatePlan> getApplicable(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam int nights) {
        return repo.findApplicable(checkIn, nights);
    }

    @GetMapping("/{id}")
    public RatePlan getOne(@PathVariable UUID id) {
        return repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rate plan not found: " + id));
    }

    @PostMapping
    public RatePlan create(@RequestBody RatePlan plan) {
        plan.setId(null);
        if (plan.getActive() == null) plan.setActive(true);
        if (plan.getDiscountPercent() == null) {
            plan.setDiscountPercent(java.math.BigDecimal.ZERO);
        }
        return repo.save(plan);
    }

    @PutMapping("/{id}")
    public RatePlan update(@PathVariable UUID id, @RequestBody RatePlan body) {
        RatePlan plan = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rate plan not found: " + id));
        if (body.getName() != null) plan.setName(body.getName());
        if (body.getDescription() != null) plan.setDescription(body.getDescription());
        if (body.getType() != null) plan.setType(body.getType());
        if (body.getDiscountPercent() != null) plan.setDiscountPercent(body.getDiscountPercent());
        if (body.getMinNights() != null) plan.setMinNights(body.getMinNights());
        if (body.getValidFrom() != null) plan.setValidFrom(body.getValidFrom());
        if (body.getValidTo() != null) plan.setValidTo(body.getValidTo());
        if (body.getActive() != null) plan.setActive(body.getActive());
        return repo.save(plan);
    }

    @PatchMapping("/{id}/toggle")
    public RatePlan toggle(@PathVariable UUID id) {
        RatePlan plan = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rate plan not found: " + id));
        plan.setActive(!Boolean.TRUE.equals(plan.getActive()));
        return repo.save(plan);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
