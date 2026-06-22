package com.booksys.employee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for {@link Staff} entities.
 *
 * <p>Uses {@link UUID} as the primary-key type, matching the {@code @GeneratedValue} UUID
 * strategy declared on {@link Staff#id}. Extends Spring Data JPA's {@link JpaRepository}
 * so all standard CRUD operations are provided automatically.</p>
 */
@Repository
public interface StaffRepository extends JpaRepository<Staff, UUID> {

    /**
     * Find all staff members whose first name exactly matches the given value.
     *
     * @param name the first name to search for (case-sensitive, exact match)
     * @return list of matching staff members; empty list if none found
     */
    List<Staff> findByFirstName(String name);

    /**
     * Find all staff members belonging to a specific hotel.
     *
     * @param hotelId UUID of the hotel
     * @return list of staff associated with that hotel
     */
    List<Staff> findByHotelId(UUID hotelId);
}
