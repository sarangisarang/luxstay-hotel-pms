package com.booksys.housekeeping;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/housekeeping")
@RequiredArgsConstructor
public class HousekeepingController {

    private final HousekeepingRepository repo;

    @GetMapping
    public List<HousekeepingTaskDto> getAll() {
        return repo.findAll().stream().map(HousekeepingTaskDto::from).toList();
    }

    @GetMapping("/active")
    public List<HousekeepingTaskDto> getActive() {
        return repo.findActiveTasks().stream().map(HousekeepingTaskDto::from).toList();
    }

    @GetMapping("/status/{status}")
    public List<HousekeepingTaskDto> byStatus(@PathVariable HousekeepingStatus status) {
        return repo.findByStatus(status).stream().map(HousekeepingTaskDto::from).toList();
    }

    @GetMapping("/assigned/{staff}")
    public List<HousekeepingTaskDto> byStaff(@PathVariable String staff) {
        return repo.findByAssignedTo(staff).stream().map(HousekeepingTaskDto::from).toList();
    }

    @GetMapping("/{id}")
    public HousekeepingTaskDto getOne(@PathVariable UUID id) {
        return HousekeepingTaskDto.from(repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + id)));
    }

    @PostMapping
    public HousekeepingTaskDto create(@RequestBody HousekeepingTask task) {
        task.setId(null);
        if (task.getStatus() == null) task.setStatus(HousekeepingStatus.PENDING);
        if (task.getPriority() == null) task.setPriority(Priority.MEDIUM);
        if (task.getScheduledAt() == null) task.setScheduledAt(LocalDateTime.now());
        return HousekeepingTaskDto.from(repo.save(task));
    }

    @PutMapping("/{id}")
    public HousekeepingTaskDto update(@PathVariable UUID id, @RequestBody HousekeepingTask body) {
        HousekeepingTask task = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + id));
        if (body.getRoomNumber() != null) task.setRoomNumber(body.getRoomNumber());
        if (body.getRoomId() != null) task.setRoomId(body.getRoomId());
        if (body.getStatus() != null) task.setStatus(body.getStatus());
        if (body.getType() != null) task.setType(body.getType());
        if (body.getPriority() != null) task.setPriority(body.getPriority());
        if (body.getAssignedTo() != null) task.setAssignedTo(body.getAssignedTo());
        if (body.getNotes() != null) task.setNotes(body.getNotes());
        if (body.getScheduledAt() != null) task.setScheduledAt(body.getScheduledAt());
        if (body.getCompletedAt() != null) task.setCompletedAt(body.getCompletedAt());
        return HousekeepingTaskDto.from(repo.save(task));
    }

    @PatchMapping("/{id}/status")
    public HousekeepingTaskDto updateStatus(@PathVariable UUID id,
                                             @RequestBody Map<String, String> body) {
        HousekeepingTask task = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + id));
        HousekeepingStatus newStatus = HousekeepingStatus.valueOf(body.get("status"));
        task.setStatus(newStatus);
        if (newStatus == HousekeepingStatus.DONE && task.getCompletedAt() == null) {
            task.setCompletedAt(LocalDateTime.now());
        }
        return HousekeepingTaskDto.from(repo.save(task));
    }

    @PatchMapping("/{id}/assign")
    public HousekeepingTaskDto assign(@PathVariable UUID id,
                                       @RequestBody Map<String, String> body) {
        HousekeepingTask task = repo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Task not found: " + id));
        task.setAssignedTo(body.get("assignedTo"));
        return HousekeepingTaskDto.from(repo.save(task));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
