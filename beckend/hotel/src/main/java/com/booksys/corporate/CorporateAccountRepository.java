package com.booksys.corporate;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CorporateAccountRepository extends JpaRepository<CorporateAccount, UUID> {
    List<CorporateAccount> findByStatus(CorporateStatus status);
    List<CorporateAccount> findByCompanyNameContainingIgnoreCase(String name);
    long countByStatus(CorporateStatus status);
}
