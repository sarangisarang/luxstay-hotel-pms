package com.booksys.hotel.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Hotel Management API",
                version = "1.0",
                description = "Backend REST API documentation for Hotel Booking System",
                contact = @Contact(
                        name = "Hotel API Support",
                        email = "support@hotel.com"
                )
        ),
        servers = {
                @Server(url = "http://localhost:8080", description = "Local Development Server")
        }
)
public class SwaggerConfig {
    // No manual beans required — Springdoc auto-generates Swagger UI.
}
