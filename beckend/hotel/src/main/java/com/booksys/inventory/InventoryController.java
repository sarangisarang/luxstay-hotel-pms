package com.booksys.inventory;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@SuppressWarnings("null")
@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryItemRepository itemRepo;
    private final InventoryMovementRepository movementRepo;

    // ── Items ──────────────────────────────────────────────────

    @GetMapping
    public List<InventoryItem> getAll() {
        return itemRepo.findByActiveTrue();
    }

    @GetMapping("/low-stock")
    public List<InventoryItem> getLowStock() {
        return itemRepo.findLowStock();
    }

    @GetMapping("/category/{cat}")
    public List<InventoryItem> getByCategory(@PathVariable InventoryCategory cat) {
        return itemRepo.findByCategory(cat);
    }

    @PostMapping
    public InventoryItem create(@RequestBody InventoryItem item) {
        item.setId(null);
        return itemRepo.save(item);
    }

    @PatchMapping("/{id}")
    public InventoryItem update(@PathVariable UUID id, @RequestBody InventoryItem patch) {
        InventoryItem item = itemRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Item not found: " + id));
        if (patch.getName() != null)      item.setName(patch.getName());
        if (patch.getCategory() != null)  item.setCategory(patch.getCategory());
        if (patch.getUnitCost() != null)  item.setUnitCost(patch.getUnitCost());
        if (patch.getMinStock() != null)  item.setMinStock(patch.getMinStock());
        return itemRepo.save(item);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        itemRepo.findById(id).ifPresent(item -> {
            item.setActive(false);
            itemRepo.save(item);
        });
        return ResponseEntity.noContent().build();
    }

    // ── Stock adjustments ──────────────────────────────────────

    @PostMapping("/{id}/adjust")
    public InventoryItem adjustStock(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        InventoryItem item = itemRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Item not found: " + id));

        int qty = ((Number) body.getOrDefault("quantity", 0)).intValue();
        String direction = String.valueOf(body.getOrDefault("direction", "IN"));
        String note = (String) body.getOrDefault("note", "");
        String staffName = (String) body.getOrDefault("staffName", "");

        int delta = "OUT".equals(direction) ? -qty : qty;
        item.setCurrentStock(Math.max(0, item.getCurrentStock() + delta));
        itemRepo.save(item);

        movementRepo.save(InventoryMovement.builder()
                .itemId(item.getId())
                .itemName(item.getName())
                .quantity(qty)
                .direction(direction)
                .staffName(staffName)
                .note(note)
                .build());

        return item;
    }

    // ── Movements ──────────────────────────────────────────────

    @GetMapping("/movements")
    public List<InventoryMovement> getMovements() {
        return movementRepo.findTop100ByOrderByCreatedAtDesc();
    }

    @GetMapping("/{id}/movements")
    public List<InventoryMovement> getItemMovements(@PathVariable UUID id) {
        return movementRepo.findByItemIdOrderByCreatedAtDesc(id);
    }

    // ── Summary ────────────────────────────────────────────────

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        List<InventoryItem> all = itemRepo.findByActiveTrue();
        List<InventoryItem> low = itemRepo.findLowStock();
        long totalItems = all.size();
        long lowStockCount = low.size();
        java.math.BigDecimal totalValue = all.stream()
                .map(i -> i.getUnitCost().multiply(java.math.BigDecimal.valueOf(i.getCurrentStock())))
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        return Map.of(
                "totalItems", totalItems,
                "lowStockCount", lowStockCount,
                "totalStockValue", totalValue
        );
    }
}
