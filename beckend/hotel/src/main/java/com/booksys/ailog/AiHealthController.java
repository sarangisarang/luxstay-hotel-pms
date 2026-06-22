package com.booksys.ailog;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/monitor")
@RequiredArgsConstructor
public class AiHealthController {

    private final AiCallLogRepository logRepo;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTION')")
    public Map<String, Object> stats() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalCalls",    logRepo.count());
        m.put("claudeCalls",   logRepo.countClaudeCalls());
        m.put("ragCalls",      logRepo.countRagCalls());
        m.put("handoffs",      logRepo.countHandoffs());
        m.put("avgLatencyMs",  logRepo.avgLatencyMs());
        return m;
    }

    @GetMapping("/recent")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AiCallLog> recent() {
        return logRepo.findRecent();
    }
}
