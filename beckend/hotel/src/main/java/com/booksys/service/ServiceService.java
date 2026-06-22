package com.booksys.service;

import java.util.List;
import java.util.UUID;


public interface ServiceService {
    ServiceDTO createService(ServiceDTO dto);
    List<ServiceDTO> getAllServices();
    ServiceDTO getServiceById(UUID id);
    ServiceDTO updateService(UUID id, ServiceDTO dto);
    void deleteService(UUID id);
}