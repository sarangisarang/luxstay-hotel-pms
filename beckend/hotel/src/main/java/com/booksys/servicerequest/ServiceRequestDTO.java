package com.booksys.servicerequest;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceRequestDTO {

    private UUID id;

    @NotNull(message = "Guest ID must not be null")
    private UUID guestId;

    @NotNull(message = "Service ID must not be null")
    private UUID serviceId;

    @NotNull(message = "Status is required")
    private ServiceRequestStatus status;

    @Size(min = 0, max = 300, message = "Description must be between 5 and 300 characters")
    private String description;

    @NotNull(message = "Request date is required")
    private LocalDateTime requestDate;

}
