package com.booksys.employee;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ShiftScheduleRepository extends JpaRepository<ShiftSchedule, UUID> {
    List<ShiftSchedule> findByDateBetweenOrderByDateAscShiftStartAsc(LocalDate from, LocalDate to);
    List<ShiftSchedule> findByStaffIdOrderByDateAsc(UUID staffId);
}
