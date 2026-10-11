package com.booksys.user;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByEmail(String email);

    /**
     * Case-insensitive lookup. Older data may contain the same address in two
     * spellings (registration did not normalise case), so the first match wins.
     */
    Optional<AppUser> findFirstByEmailIgnoreCaseOrderByEmailAsc(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByRole(Role role);
}
