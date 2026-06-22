package com.booksys.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/evaluate")
@RequiredArgsConstructor
public class AiEvaluationController {

    private final AiEvaluationService evaluationService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTION')")
    public ResponseEntity<AiEvaluationService.EvalReport> runEval() {
        return ResponseEntity.ok(evaluationService.run());
    }
}
