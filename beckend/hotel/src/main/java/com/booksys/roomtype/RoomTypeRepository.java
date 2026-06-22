package com.booksys.roomtype;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

/**
 * Repository interface for RoomType entity.
 */
@Repository
public interface RoomTypeRepository extends JpaRepository<RoomType, UUID> {
    boolean existsByName(String name);
}
