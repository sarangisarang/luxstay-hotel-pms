package com.booksys.employee;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/shifts")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ShiftController {

    private final ShiftScheduleRepository repo;

    @GetMapping
    public List<ShiftSchedule> all() {
        return repo.findAll();
    }

    /**
     * Returns shifts for a given ISO week, e.g. week=2026-W21.
     * Defaults to current week if not supplied.
     */
    @GetMapping("/week")
    public List<ShiftSchedule> byWeek(@RequestParam(required = false) String week) {
        LocalDate monday;
        if (week != null && week.matches("\\d{4}-W\\d{2}")) {
            int year = Integer.parseInt(week.substring(0, 4));
            int weekNum = Integer.parseInt(week.substring(6));
            monday = LocalDate.ofYearDay(year, 1)
                    .with(IsoFields.WEEK_OF_WEEK_BASED_YEAR, weekNum)
                    .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        } else {
            monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        }
        LocalDate sunday = monday.plusDays(6);
        return repo.findByDateBetweenOrderByDateAscShiftStartAsc(monday, sunday);
    }

    @PostMapping
    public ResponseEntity<ShiftSchedule> create(@RequestBody ShiftSchedule shift) {
        return ResponseEntity.ok(repo.save(shift));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ShiftSchedule> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return repo.findById(id).map(s -> {
            try { s.setStatus(ShiftStatus.valueOf(body.get("status"))); } catch (Exception ignored) {}
            return ResponseEntity.ok(repo.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
