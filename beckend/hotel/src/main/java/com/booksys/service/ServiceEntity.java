package com.booksys.service;
import com.booksys.servicerequest.ServiceRequest;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "service_entity")
public class ServiceEntity {

    @Id
    @GeneratedValue()
    private UUID id;
    private String name;
    private String description;
    private BigDecimal price;

    @OneToMany(mappedBy = "service")
    private List<ServiceRequest> serviceRequests;

}

