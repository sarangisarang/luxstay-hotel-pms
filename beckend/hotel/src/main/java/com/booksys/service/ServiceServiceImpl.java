package com.booksys.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Default implementation of {@link ServiceService}.
 *
 * <p>Manages hotel add-on services (e.g. breakfast, spa, laundry) that can be attached
 * to bookings. Service prices are included in the booking's total amount calculation.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ServiceServiceImpl implements ServiceService {

    private final ServiceRepository serviceRepository;

    /**
     * Creates a new hotel service from the provided DTO.
     *
     * @param dto DTO with service name, description, and price
     * @return the persisted service as a DTO
     */
    @Override
    public ServiceDTO createService(ServiceDTO dto) {
        return ServiceMapper.toDTO(serviceRepository.save(ServiceMapper.toEntity(dto)));
    }

    /**
     * Returns all available hotel services.
     *
     * @return list of service DTOs; empty if none exist
     */
    @Override
    public List<ServiceDTO> getAllServices() {
        return ServiceMapper.toDTOList(serviceRepository.findAll());
    }

    /**
     * Returns a single service by its UUID.
     *
     * @param id UUID of the service
     * @return the service as a DTO
     * @throws EntityNotFoundException if no service with the given ID exists
     */
    @Override
    public ServiceDTO getServiceById(UUID id) {
        return ServiceMapper.toDTO(serviceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Service not found: " + id)));
    }

    /**
     * Updates an existing service's name, description, and price.
     *
     * @param id  UUID of the service to update
     * @param dto DTO with the new values
     * @return the updated service as a DTO
     * @throws EntityNotFoundException if no service with the given ID exists
     */
    @Override
    public ServiceDTO updateService(UUID id, ServiceDTO dto) {
        ServiceEntity existing = serviceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Service not found: " + id));
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setPrice(dto.getPrice());
        return ServiceMapper.toDTO(serviceRepository.save(existing));
    }

    /**
     * Permanently deletes a service.
     *
     * @param id UUID of the service to delete
     * @throws EntityNotFoundException if no service with the given ID exists
     */
    @Override
    public void deleteService(UUID id) {
        if (!serviceRepository.existsById(id)) {
            throw new EntityNotFoundException("Service not found: " + id);
        }
        serviceRepository.deleteById(id);
    }
}