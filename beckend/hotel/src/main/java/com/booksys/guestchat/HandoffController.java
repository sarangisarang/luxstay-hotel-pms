package com.booksys.guestchat;

import com.booksys.chatmemory.ChatMemory;
import com.booksys.chatmemory.ChatMemoryRepository;
import com.booksys.email.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/public/ai")
@RequiredArgsConstructor
public class HandoffController {

    private final ChatMemoryRepository memoryRepo;
    private final EmailService         emailService;

    @Value("${app.mail.from:noreply@luxstay.com}")
    private String receptionEmail;

    @PostMapping("/handoff")
    public Map<String, Object> requestHandoff(@RequestBody HandoffRequest req) {
        String sessionId  = req.sessionId() != null ? req.sessionId() : "unknown";
        String guestName  = req.guestName() != null ? req.guestName() : "Guest";
        String guestEmail = req.guestEmail();
        String reason     = req.reason() != null ? req.reason() : "Guest requested live support";

        // Pull last 10 messages from this session for context
        List<ChatMemory> history = memoryRepo.findLastN(sessionId, 10);
        String transcript = history.stream()
                .map(m -> "[" + m.getRole().toUpperCase() + "] " + m.getContent())
                .collect(Collectors.joining("\n"));

        // Notify reception by email (async, won't fail the request)
        String subject = "🛎️ Live Support Request — " + guestName;
        String html = buildHandoffEmail(guestName, guestEmail, reason, transcript);
        emailService.sendRaw(receptionEmail, "Reception", subject, html);

        log.info("Handoff requested by session={} name={}", sessionId, guestName);
        return Map.of(
                "status", "requested",
                "message", "Your request has been sent to our reception team. They will reach out to you shortly!"
        );
    }

    private String buildHandoffEmail(String name, String email, String reason, String transcript) {
        return """
                <html><body style="font-family:sans-serif;padding:20px">
                <h2 style="color:#4f46e5">🛎️ Live Support Request</h2>
                <table style="border-collapse:collapse;width:100%%">
                  <tr><td style="padding:8px;color:#64748b;width:120px">Guest Name</td><td style="padding:8px;font-weight:600">%s</td></tr>
                  <tr><td style="padding:8px;color:#64748b">Email</td><td style="padding:8px">%s</td></tr>
                  <tr><td style="padding:8px;color:#64748b">Reason</td><td style="padding:8px">%s</td></tr>
                </table>
                <h3 style="color:#374151;margin-top:20px">Recent Chat Transcript</h3>
                <pre style="background:#f8fafc;padding:16px;border-radius:8px;font-size:13px;white-space:pre-wrap">%s</pre>
                </body></html>
                """.formatted(name, email != null ? email : "—", reason, transcript);
    }

    public record HandoffRequest(
            String sessionId,
            String guestName,
            String guestEmail,
            String reason
    ) {}
}
