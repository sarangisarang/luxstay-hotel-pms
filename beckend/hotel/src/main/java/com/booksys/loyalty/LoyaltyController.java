package com.booksys.loyalty;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/loyalty")
@RequiredArgsConstructor
public class LoyaltyController {

    private final GuestLoyaltyRepository repo;

    @GetMapping
    public List<GuestLoyalty> getAll() {
        return repo.findTopMembers();
    }

    @GetMapping("/tier/{tier}")
    public List<GuestLoyalty> byTier(@PathVariable LoyaltyTier tier) {
        return repo.findByTier(tier);
    }

    @GetMapping("/guest/{guestId}")
    public GuestLoyalty byGuest(@PathVariable UUID guestId) {
        return repo.findByGuestId(guestId)
                .orElseThrow(() -> new EntityNotFoundException("No loyalty record for guest: " + guestId));
    }

    @GetMapping("/email/{email}")
    public GuestLoyalty byEmail(@PathVariable String email) {
        return repo.findByGuestEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("No loyalty record for: " + email));
    }

    @PostMapping("/award")
    public GuestLoyalty awardPoints(@RequestBody AwardPointsRequest req) {
        GuestLoyalty loyalty = repo.findByGuestId(req.guestId())
                .orElseGet(() -> {
                    GuestLoyalty gl = new GuestLoyalty();
                    gl.setGuestId(req.guestId());
                    gl.setGuestEmail(req.guestEmail());
                    gl.setGuestName(req.guestName());
                    gl.setPoints(0);
                    gl.setTier(LoyaltyTier.BRONZE);
                    gl.setTotalStays(0);
                    gl.setTotalSpent(BigDecimal.ZERO);
                    return gl;
                });

        loyalty.setPoints(loyalty.getPoints() + req.points());
        loyalty.setTotalStays(loyalty.getTotalStays() + (req.countStay() ? 1 : 0));
        if (req.amountSpent() != null) {
            loyalty.setTotalSpent(loyalty.getTotalSpent().add(req.amountSpent()));
        }
        loyalty.setTier(computeTier(loyalty.getPoints()));
        return repo.save(loyalty);
    }

    @PatchMapping("/{id}/redeem")
    public GuestLoyalty redeemPoints(@PathVariable UUID id,
                                      @RequestBody Map<String, Integer> body) {
        GuestLoyalty loyalty = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Loyalty record not found: " + id));
        int redeem = body.getOrDefault("points", 0);
        if (redeem > loyalty.getPoints()) {
            throw new IllegalArgumentException("Insufficient points");
        }
        loyalty.setPoints(loyalty.getPoints() - redeem);
        loyalty.setTier(computeTier(loyalty.getPoints()));
        return repo.save(loyalty);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        long total = repo.count();
        return Map.of(
                "totalMembers", total,
                "bronze",    repo.countByTier(LoyaltyTier.BRONZE),
                "silver",    repo.countByTier(LoyaltyTier.SILVER),
                "gold",      repo.countByTier(LoyaltyTier.GOLD),
                "platinum",  repo.countByTier(LoyaltyTier.PLATINUM)
        );
    }

    private LoyaltyTier computeTier(int points) {
        if (points >= 10000) return LoyaltyTier.PLATINUM;
        if (points >= 5000)  return LoyaltyTier.GOLD;
        if (points >= 1500)  return LoyaltyTier.SILVER;
        return LoyaltyTier.BRONZE;
    }

    public record AwardPointsRequest(
            UUID guestId,
            String guestEmail,
            String guestName,
            int points,
            boolean countStay,
            BigDecimal amountSpent
    ) {}
}
