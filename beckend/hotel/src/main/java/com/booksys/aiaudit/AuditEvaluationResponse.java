package com.booksys.aiaudit;

public record AuditEvaluationResponse(
        String category,
        String score,        // STRONG | SUSPICIOUS | WEAK
        String feedback,     // Short explanation
        boolean critical
) {}
