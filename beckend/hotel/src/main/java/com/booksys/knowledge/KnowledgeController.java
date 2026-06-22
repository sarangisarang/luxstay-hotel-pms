package com.booksys.knowledge;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/knowledge")
@RequiredArgsConstructor
public class KnowledgeController {

    private final KnowledgeRepository repo;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTION')")
    public List<KnowledgeEntry> getAll() {
        return repo.findAll();
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTION')")
    public List<KnowledgeEntry> getActive() {
        return repo.findByActiveOrderByPriorityDesc(true);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTION')")
    public List<KnowledgeEntry> search(@RequestParam String q) {
        List<KnowledgeEntry> results = repo.searchByText(q);
        if (results.isEmpty()) {
            results = repo.searchByKeyword(q);
        }
        return results;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public KnowledgeEntry create(@RequestBody KnowledgeEntry entry) {
        entry.setId(null);
        return repo.save(entry);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<KnowledgeEntry> update(@PathVariable UUID id,
                                                  @RequestBody KnowledgeEntry entry) {
        return repo.findById(id).map(existing -> {
            existing.setCategory(entry.getCategory());
            existing.setTitle(entry.getTitle());
            existing.setContent(entry.getContent());
            existing.setTags(entry.getTags());
            existing.setActive(entry.isActive());
            existing.setPriority(entry.getPriority());
            return ResponseEntity.ok(repo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<KnowledgeEntry> toggle(@PathVariable UUID id) {
        return repo.findById(id).map(e -> {
            e.setActive(!e.isActive());
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }
}
