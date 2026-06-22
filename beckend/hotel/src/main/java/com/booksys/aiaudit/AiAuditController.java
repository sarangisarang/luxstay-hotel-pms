package com.booksys.aiaudit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

/**
 * AI Audit Agent — evaluates AI automation companies against a 15-category checklist.
 * Uses Claude API when key is set; falls back to rule-based scoring when not configured.
 */
@Slf4j
@RestController
@RequestMapping("/api/ai/audit")
@RequiredArgsConstructor
public class AiAuditController {

    @Value("${ai.claude.api-key:}")
    private String apiKey;

    private static final String CLAUDE_URL = "https://api.anthropic.com/v1/messages";

    // ── Questions per category ──────────────────────────────────────────────

    private static final Map<String, Map<String, Object>> CATEGORIES = buildCategories();

    private static Map<String, Map<String, Object>> buildCategories() {
        Map<String, Map<String, Object>> m = new LinkedHashMap<>();
        add(m, "ARCHITECTURE",       true,  "How do you technically build your AI chatbot? Describe your backend, LLM provider, RAG pipeline, CRM/API integrations, logging, and human handoff.");
        add(m, "RAG_KNOWLEDGE_BASE", true,  "Do you use RAG? How do you process PDF/FAQ/website content? Explain document chunking, embeddings, retrieval, and context injection.");
        add(m, "VECTOR_DB",          false, "Which vector database do you use (Pinecone, Qdrant, Supabase Vector, Weaviate, Chroma) and why did you choose it?");
        add(m, "HALLUCINATION",      true,  "How do you control the bot from giving wrong answers? Describe your knowledge base limits, fallback logic, 'I don't know' handling, and testing approach.");
        add(m, "HUMAN_HANDOFF",      true,  "If the bot doesn't know the answer or the question involves refunds/legal/pricing/complaints, does it hand off to a human? How?");
        add(m, "AUTOMATION_TOOLS",   false, "What do you use for automation — n8n, Zapier, Make, or a custom backend? How do you choose between them?");
        add(m, "MONITORING_RETRY",   true,  "If automation breaks, how do you find out? Describe your logs, alerts, retry mechanism, error notifications, and monitoring dashboard.");
        add(m, "LIVE_DEMO",          true,  "Can you show a live demo: user message → lead capture → CRM/Sheets → notification → human handoff?");
        add(m, "INTEGRATIONS",       false, "Which systems do you have real integrations with? (e.g. HubSpot, Salesforce, Stripe, WhatsApp, Telegram, Google Sheets, Gmail, Calendly)");
        add(m, "SECURITY_SECRETS",   true,  "Where are API keys, passwords, and secrets stored? How do you handle access control and key rotation?");
        add(m, "CUSTOMER_DATA",      true,  "Where is customer data stored and who has access? Describe your storage model, role-based access, least privilege, and data ownership policy.");
        add(m, "FALLBACK",           false, "If OpenAI, WhatsApp, or another critical API goes down, what happens? Do you have fallback messages, retries, alerts, and alternative providers?");
        add(m, "HOSTING_STACK",      false, "Where do you host your systems? Describe your full tech stack (Vercel, AWS, GCP, Azure, DigitalOcean, backend, database, deployment pipeline).");
        add(m, "CODE_QUALITY",       false, "Do you use GitHub/GitLab, separate staging and production, code review, and automated tests? Describe your deployment process.");
        add(m, "OWNERSHIP_EXIT",     true,  "Who owns the source code, prompts, workflows, hosting, database, and customer data? If the client leaves, can they take everything with them?");
        return Collections.unmodifiableMap(m);
    }

    private static void add(Map<String, Map<String, Object>> m, String key, boolean critical, String question) {
        m.put(key, Map.of("question", question, "critical", critical));
    }

    // ── Endpoints ──────────────────────────────────────────────────────────

    /** Returns all 15 audit questions with metadata. */
    @GetMapping("/questions")
    public List<Map<String, Object>> getQuestions() {
        List<Map<String, Object>> list = new ArrayList<>();
        CATEGORIES.forEach((key, meta) -> {
            Map<String, Object> q = new LinkedHashMap<>();
            q.put("category",  key);
            q.put("question",  meta.get("question"));
            q.put("critical",  meta.get("critical"));
            list.add(q);
        });
        return list;
    }

    /** Evaluates a single answer for one category. */
    @PostMapping("/evaluate")
    public AuditEvaluationResponse evaluate(@RequestBody AuditEvaluationRequest req) {
        Map<String, Object> catMeta = CATEGORIES.get(req.category());
        boolean critical = catMeta != null && Boolean.TRUE.equals(catMeta.get("critical"));

        if (apiKey == null || apiKey.isBlank()) {
            return ruleBasedScore(req.category(), req.answer(), critical);
        }
        return claudeScore(req.category(), req.question(), req.answer(), critical);
    }

    /** Generates a full audit report from all 15 answers. */
    @PostMapping("/report")
    public Map<String, Object> generateReport(@RequestBody AuditReportRequest req) {
        List<Map<String, Object>> results = new ArrayList<>();
        int strong = 0, suspicious = 0, weak = 0;

        for (Map<String, String> item : req.answers()) {
            String cat      = item.getOrDefault("category", "");
            String question = item.getOrDefault("question", "");
            String answer   = item.getOrDefault("answer",   "");

            Map<String, Object> meta = CATEGORIES.getOrDefault(cat, Map.of("critical", false));
            boolean critical = Boolean.TRUE.equals(meta.get("critical"));

            AuditEvaluationResponse res = (apiKey == null || apiKey.isBlank())
                    ? ruleBasedScore(cat, answer, critical)
                    : claudeScore(cat, question, answer, critical);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("category", cat);
            row.put("question", question);
            row.put("answer",   answer);
            row.put("score",    res.score());
            row.put("feedback", res.feedback());
            row.put("critical", res.critical());
            results.add(row);

            if ("STRONG".equals(res.score()))          strong++;
            else if ("SUSPICIOUS".equals(res.score())) suspicious++;
            else                                        weak++;
        }

        int total = strong + suspicious + weak;
        int scorePercent = total == 0 ? 0 : (int) Math.round((strong * 100.0 + suspicious * 50.0) / (total * 100.0) * 100);

        String verdict;
        if      (scorePercent >= 75) verdict = "TRUSTED";
        else if (scorePercent >= 50) verdict = "REVIEW_NEEDED";
        else                         verdict = "RED_FLAGS";

        return Map.of(
                "companyName",   req.companyName(),
                "results",       results,
                "strong",        strong,
                "suspicious",    suspicious,
                "weak",          weak,
                "scorePercent",  scorePercent,
                "verdict",       verdict,
                "generatedAt",   java.time.Instant.now().toString()
        );
    }

    // ── Claude-based scoring ───────────────────────────────────────────────

    private AuditEvaluationResponse claudeScore(String category, String question, String answer, boolean critical) {
        try {
            String prompt = """
                You are a technical evaluator assessing AI automation companies.

                Category: %s
                Question asked: %s
                Company's answer: %s

                Score this answer as one of:
                - STRONG: Detailed, concrete, technically sound answer with real examples
                - SUSPICIOUS: Partial knowledge, vague, or missing key details
                - WEAK: No real answer, buzzwords only, "we'll figure it out later"

                Respond in JSON only, exactly this format:
                {"score":"STRONG|SUSPICIOUS|WEAK","feedback":"one sentence explanation"}
                """.formatted(category, question, answer);

            WebClient client = WebClient.builder()
                    .baseUrl(CLAUDE_URL)
                    .defaultHeader("x-api-key", apiKey)
                    .defaultHeader("anthropic-version", "2023-06-01")
                    .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .build();

            Map<String, Object> body = Map.of(
                    "model", "claude-haiku-4-5-20251001",
                    "max_tokens", 150,
                    "messages", List.of(Map.of("role", "user", "content", prompt))
            );

            @SuppressWarnings({"unchecked","rawtypes"})
            Map<String, Object> resp = (Map<String, Object>) client.post()
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (resp == null) throw new IllegalStateException("null response from Claude API");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> content = (List<Map<String, Object>>) resp.get("content");
            String text = content != null && !content.isEmpty() ? (String) content.get(0).get("text") : "{}";

            // Parse the JSON response
            text = text.trim();
            String scoreStr   = extractJson(text, "score");
            String feedbackStr = extractJson(text, "feedback");

            AuditScore score = parseScore(scoreStr);
            return new AuditEvaluationResponse(category, score.name(), feedbackStr, critical);

        } catch (Exception e) {
            log.warn("Claude audit eval failed for {}: {}", category, e.getMessage());
            return ruleBasedScore(category, answer, critical);
        }
    }

    // ── Rule-based fallback scoring ────────────────────────────────────────

    private AuditEvaluationResponse ruleBasedScore(String category, String answer, boolean critical) {
        if (answer == null || answer.isBlank()) {
            return new AuditEvaluationResponse(category, AuditScore.WEAK.name(),
                    "No answer provided.", critical);
        }
        String low = answer.toLowerCase();
        int wordCount = answer.trim().split("\\s+").length;

        // Red flag phrases
        boolean hasRedFlag = containsAny(low,
                "don't know", "we'll figure", "mera", "later", "not sure",
                "chatgpt will", "ai knows", "trust the ai", "no backup",
                "no monitoring", "doesn't matter", "not needed");

        // Strong signal phrases
        boolean hasStrong = containsAny(low,
                "rag", "vector", "embedding", "pinecone", "qdrant", "weaviate", "chroma",
                "n8n", "webhook", "retry", "alert", "monitoring", "github", "staging",
                "production", "role-based", "env var", "secret manager", "handoff",
                "fallback", "contract", "export", "repository", "ci/cd", "pipeline",
                "hubspot", "salesforce", "stripe", "webhook");

        AuditScore score;
        String feedback;

        if (hasRedFlag) {
            score    = AuditScore.WEAK;
            feedback = "Answer contains red flags suggesting lack of technical depth or process.";
        } else if (hasStrong && wordCount >= 20) {
            score    = AuditScore.STRONG;
            feedback = "Answer demonstrates concrete technical knowledge and real implementation details.";
        } else if (wordCount < 10) {
            score    = AuditScore.WEAK;
            feedback = "Answer is too brief — lacks sufficient detail or evidence.";
        } else {
            score    = AuditScore.SUSPICIOUS;
            feedback = "Answer shows partial knowledge but lacks concrete examples or specific tools.";
        }

        return new AuditEvaluationResponse(category, score.name(), feedback, critical);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private boolean containsAny(String text, String... keywords) {
        for (String kw : keywords) if (text.contains(kw)) return true;
        return false;
    }

    private AuditScore parseScore(String s) {
        if (s == null) return AuditScore.SUSPICIOUS;
        return switch (s.toUpperCase().trim()) {
            case "STRONG"     -> AuditScore.STRONG;
            case "WEAK"       -> AuditScore.WEAK;
            default           -> AuditScore.SUSPICIOUS;
        };
    }

    private String extractJson(String json, String key) {
        String search = "\"" + key + "\":\"";
        int start = json.indexOf(search);
        if (start < 0) return "";
        start += search.length();
        int end = json.indexOf("\"", start);
        return end > start ? json.substring(start, end) : "";
    }
}
