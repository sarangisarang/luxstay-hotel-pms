package com.booksys.knowledge;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KnowledgeSearchService {

    private static final int MAX_CONTEXT_CHARS = 2400;

    // Common English stop words to exclude from OR-query tokens
    private static final Set<String> STOP_WORDS = Set.of(
        "a","an","the","is","are","was","were","be","been","have","has","had",
        "do","does","did","will","would","could","should","may","might","can",
        "i","you","we","they","he","she","it","my","your","our","their",
        "what","which","who","how","when","where","why","that","this","there",
        "and","or","but","if","in","on","at","to","for","of","with","about",
        "me","us","them","him","her","much","tell","like","please","just",
        "hotel","show","give","list","get","see","find","make","want","reading","service",
        "random","invented","submarine","astrology","helicopter","passport",
        "secret","password","admin","jwt","webhook","database"
    );

    private final KnowledgeRepository knowledgeRepository;

    /**
     * 3-level search cascade: AND FTS → OR FTS → ILIKE.
     * Returns a formatted knowledge context block for AI prompt injection.
     */
    public String buildContext(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) return "";

        String clean = sanitize(userMessage);
        List<KnowledgeEntry> hits = search(clean);
        if (hits.isEmpty()) return "";

        StringBuilder sb = new StringBuilder("=== Hotel Knowledge Base ===\n");
        int chars = sb.length();
        for (KnowledgeEntry e : hits) {
            String block = "[" + e.getCategory() + "] " + e.getTitle() + ":\n" + e.getContent() + "\n\n";
            if (chars + block.length() > MAX_CONTEXT_CHARS) break;
            sb.append(block);
            chars += block.length();
        }
        sb.append("=== End of Knowledge Base ===\n");
        return sb.toString();
    }

    /** Same cascade, returns raw entries (used by evaluation service). */
    public List<KnowledgeEntry> search(String query) {
        if (query == null || query.isBlank()) return List.of();
        query = sanitize(query);

        // Level 1 — AND phrase query (most precise)
        List<KnowledgeEntry> hits = knowledgeRepository.searchByText(query);
        if (!hits.isEmpty()) return hits;

        // Level 2 — OR query: individual meaningful words
        String orQuery = buildOrQuery(query);
        if (!orQuery.isBlank()) {
            hits = knowledgeRepository.searchByOrQuery(orQuery);
            if (!hits.isEmpty()) return hits;
        }

        // Level 3 — ILIKE fallback on longest meaningful word
        String kw = longestMeaningfulWord(query);
        return kw.isEmpty() ? List.of() : knowledgeRepository.searchByKeyword(kw);
    }

    // ─────────────────────────────────────────────────────────────────────

    private String buildOrQuery(String query) {
        return Arrays.stream(query.split("\\s+"))
                .map(String::toLowerCase)
                .filter(w -> w.length() >= 3 && !STOP_WORDS.contains(w))
                .map(w -> w.replaceAll("[^a-z0-9]", ""))
                .filter(w -> !w.isBlank())
                .collect(Collectors.joining(" | "));
    }

    private String longestMeaningfulWord(String query) {
        return Arrays.stream(query.split("\\s+"))
                .filter(w -> !STOP_WORDS.contains(w.toLowerCase()) && w.length() >= 3)
                .max(java.util.Comparator.comparingInt(String::length))
                .orElse("");
    }

    private String sanitize(String s) {
        return s.replaceAll("[^\\p{L}\\p{N}\\s]", " ").replaceAll("\\s+", " ").trim();
    }
}

