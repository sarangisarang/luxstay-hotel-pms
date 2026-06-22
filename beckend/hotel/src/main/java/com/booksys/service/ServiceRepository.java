package com.booksys.service;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ServiceRepository extends JpaRepository<ServiceEntity, UUID> {

}