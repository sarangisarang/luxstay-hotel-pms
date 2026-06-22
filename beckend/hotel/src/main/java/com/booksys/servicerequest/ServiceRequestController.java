package com.booksys.servicerequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/servicerequests")
@RequiredArgsConstructor
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    // GET all
    @GetMapping
    public List<ServiceRequestDTO> getAllRequests() {
        return serviceRequestService.getAllRequests();
    }

    // GET by ID
    @GetMapping("/{id}")
    public ResponseEntity<ServiceRequestDTO> getRequestById(@PathVariable UUID id) {
        return ResponseEntity.ok(serviceRequestService.getRequestById(id));
    }

    // POST (create)
    @PostMapping
    public ResponseEntity<ServiceRequestDTO> createRequest(@RequestBody @Valid ServiceRequestDTO dto) {
        return ResponseEntity.ok(serviceRequestService.createRequest(dto));
    }

    // PUT (update)
    @PutMapping("/{id}")
    public ResponseEntity<ServiceRequestDTO> updateRequest(@PathVariable UUID id,
                                                           @RequestBody @Valid ServiceRequestDTO dto) {
        return ResponseEntity.ok(serviceRequestService.updateRequest(id, dto));
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRequest(@PathVariable UUID id) {
        serviceRequestService.deleteRequest(id);
        return ResponseEntity.noContent().build();
    }
}
