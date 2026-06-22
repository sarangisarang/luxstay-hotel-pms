package com.booksys.group;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface GroupReservationRepository extends JpaRepository<GroupReservation, UUID> {
    List<GroupReservation> findByStatusOrderByCheckInDateAsc(GroupStatus status);

    @Query("SELECT g FROM GroupReservation g WHERE g.checkInDate >= :from AND g.checkInDate <= :to ORDER BY g.checkInDate")
    List<GroupReservation> findInRange(LocalDate from, LocalDate to);

    long countByStatus(GroupStatus status);
}
