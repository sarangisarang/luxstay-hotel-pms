package com.booksys.aiaudit;

import java.util.List;
import java.util.Map;

public record AuditReportRequest(
        String companyName,
        List<Map<String, String>> answers   // [{category, question, answer}]
) {}
