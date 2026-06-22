package com.booksys.servicerequest;

import com.booksys.booking.Booking;
import com.booksys.booking.BookingRepository;
import com.booksys.booking.BookingService;
import com.booksys.guest.Guest;
import com.booksys.guest.GuestRepository;
import com.booksys.service.ServiceEntity;
import com.booksys.service.ServiceRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Default implementation of {@link ServiceRequestService}.
 *
 * A service request records when a guest requests an add-on service (e.g. room service,
 * spa booking) during their stay. When a request is created, the service is appended to
 * all ACTIVE bookings of that guest (PENDING, CONFIRMED, CHECKED_IN) and booking totals
 * are recalculated.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ServiceRequestServiceImpl implements ServiceRequestService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final GuestRepository guestRepository;
    private final ServiceRepository serviceRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final ServiceRequestMapper serviceRequestMapper;

    @Override
    public ServiceRequestDTO createRequest(ServiceRequestDTO dto) {
        Guest guest = guestRepository.findById(dto.getGuestId())
                .orElseThrow(() -> new EntityNotFoundException("Guest not found: " + dto.getGuestId()));
        ServiceEntity service = serviceRepository.findById(dto.getServiceId())
                .orElseThrow(() -> new EntityNotFoundException("Service not found: " + dto.getServiceId()));

        ServiceRequest request = new ServiceRequest();
        request.setGuest(guest);
        request.setService(service);
        request.setRequestDate(LocalDateTime.now());
        serviceRequestRepository.save(request);

        // Append service only to active bookings (PENDING / CONFIRMED / CHECKED_IN)
        List<Booking> activeBookings = bookingRepository.findActiveByGuestId(guest.getId());
        for (Booking booking : activeBookings) {
            booking.getServices().add(service);
            booking.setTotalAmount(bookingService.calculateTotalAmount(booking));
            bookingRepository.save(booking);
        }
        return ServiceRequestMapper.toDTO(request);
    }

    @Override
    public List<ServiceRequestDTO> getAllRequests() {
        return serviceRequestRepository.findAll()
                .stream()
                .map(ServiceRequestMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ServiceRequestDTO getRequestById(UUID id) {
        return ServiceRequestMapper.toDTO(serviceRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("ServiceRequest not found: " + id)));
    }

    @Override
    public ServiceRequestDTO updateRequest(UUID id, ServiceRequestDTO dto) {
        ServiceRequest existing = serviceRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("ServiceRequest not found: " + id));

        Guest guest = guestRepository.findById(dto.getGuestId())
                .orElseThrow(() -> new EntityNotFoundException("Guest not found: " + dto.getGuestId()));

        ServiceEntity service = serviceRepository.findById(dto.getServiceId())
                .orElseThrow(() -> new EntityNotFoundException("Service not found: " + dto.getServiceId()));

        existing.setGuest(guest);
        existing.setService(service);
        existing.setStatus(dto.getStatus());
        existing.setDescription(dto.getDescription());
        existing.setRequestDate(dto.getRequestDate());

        return ServiceRequestMapper.toDTO(serviceRequestRepository.save(existing));
    }

    @Override
    public void deleteRequest(UUID id) {
        if (!serviceRequestRepository.existsById(id)) {
            throw new EntityNotFoundException("ServiceRequest not found: " + id);
        }
        serviceRequestRepository.deleteById(id);
    }
}
