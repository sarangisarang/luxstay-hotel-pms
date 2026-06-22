package com.booksys.user;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reception")
public class ReceptionController {

    @GetMapping("/dashboard")
    public ResponseEntity<String> getReceptionDashboard() {
        return ResponseEntity.ok("Reception dashboard");
    }
}
