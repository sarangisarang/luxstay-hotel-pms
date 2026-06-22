package com.booksys.servicerequest;
import java.util.List;
import java.util.UUID;

public interface ServiceRequestService {
    ServiceRequestDTO createRequest(ServiceRequestDTO serviceRequestDTO);
    List<ServiceRequestDTO> getAllRequests();
    ServiceRequestDTO getRequestById(UUID id);
    ServiceRequestDTO updateRequest(UUID id, ServiceRequestDTO updatedRequest);
    void deleteRequest(UUID id);
}