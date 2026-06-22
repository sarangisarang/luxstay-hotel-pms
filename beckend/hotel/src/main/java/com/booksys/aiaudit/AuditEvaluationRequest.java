package com.booksys.aiaudit;

public record AuditEvaluationRequest(
        String category,
        String question,
        String answer,
        String companyName
) {}
