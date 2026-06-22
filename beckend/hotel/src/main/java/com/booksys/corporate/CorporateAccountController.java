package com.booksys.corporate;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/corporate")
@RequiredArgsConstructor
public class CorporateAccountController {

    private final CorporateAccountRepository repo;

    @GetMapping
    public ResponseEntity<List<CorporateAccount>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CorporateStatus status) {
        List<CorporateAccount> list;
        if (search != null && !search.isBlank()) {
            list = repo.findByCompanyNameContainingIgnoreCase(search.trim());
        } else if (status != null) {
            list = repo.findByStatus(status);
        } else {
            list = repo.findAll();
        }
        list.sort(Comparator.comparing(CorporateAccount::getCompanyName));
        return ResponseEntity.ok(list);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", repo.count());
        for (CorporateStatus s : CorporateStatus.values()) {
            m.put(s.name().toLowerCase(), repo.countByStatus(s));
        }
        return ResponseEntity.ok(m);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CorporateAccount> getById(@PathVariable UUID id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<CorporateAccount> create(@RequestBody CorporateAccount account) {
        account.setId(null);
        return ResponseEntity.ok(repo.save(account));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CorporateAccount> update(@PathVariable UUID id, @RequestBody CorporateAccount account) {
        return repo.findById(id).map(existing -> {
            account.setId(id);
            account.setCreatedAt(existing.getCreatedAt());
            return ResponseEntity.ok(repo.save(account));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CorporateAccount> patchStatus(@PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return repo.findById(id).map(acc -> {
            acc.setStatus(CorporateStatus.valueOf(body.get("status")));
            return ResponseEntity.ok(repo.save(acc));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
