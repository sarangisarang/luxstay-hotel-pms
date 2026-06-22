package com.booksys.knowledge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface KnowledgeRepository extends JpaRepository<KnowledgeEntry, UUID> {

    List<KnowledgeEntry> findByActiveOrderByPriorityDesc(boolean active);

    List<KnowledgeEntry> findByCategoryAndActiveOrderByPriorityDesc(String category, boolean active);

    /**
     * FTS with AND-query (plainto_tsquery). Max 4 results, rank ≥ 0.01 threshold.
     */
    @Query(value = """
        SELECT * FROM knowledge_base
        WHERE active = true
          AND COALESCE(search_vector,
                to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(tags,'')))
              @@ plainto_tsquery('english', :query)
          AND ts_rank(
                COALESCE(search_vector,
                  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(tags,''))),
                plainto_tsquery('english', :query)) >= 0.01
        ORDER BY
          ts_rank(COALESCE(search_vector,
            to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(tags,''))),
            plainto_tsquery('english', :query)) DESC,
          priority DESC
        LIMIT 4
        """, nativeQuery = true)
    List<KnowledgeEntry> searchByText(@Param("query") String query);

    /**
     * OR-based FTS: each word is an independent term joined with |.
     * Used as fallback when AND-query returns no results.
     */
    @Query(value = """
        SELECT * FROM knowledge_base
        WHERE active = true
          AND COALESCE(search_vector,
                to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(tags,'')))
              @@ to_tsquery('english', :orQuery)
        ORDER BY
          ts_rank(COALESCE(search_vector,
            to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'') || ' ' || coalesce(tags,''))),
            to_tsquery('english', :orQuery)) DESC,
          priority DESC
        LIMIT 3
        """, nativeQuery = true)
    List<KnowledgeEntry> searchByOrQuery(@Param("orQuery") String orQuery);

    /**
     * ILIKE fallback — only used when FTS returns 0 results.
     * Returns max 2 results to avoid noisy context injection.
     */
    @Query(value = """
        SELECT * FROM knowledge_base
        WHERE active = true
          AND (title ILIKE %:kw% OR tags ILIKE %:kw%)
        ORDER BY priority DESC
        LIMIT 2
        """, nativeQuery = true)
    List<KnowledgeEntry> searchByKeyword(@Param("kw") String keyword);
}
