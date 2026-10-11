package com.booksys.roomtype;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.TimeUnit;

/**
 * Serves uploaded images from the local {@code uploads/} folder.
 *
 * <p>CORS is configured once, in {@code SecurityConfig#corsConfigurationSource}
 * (from ALLOWED_ORIGINS); the second, hard-coded localhost mapping that used
 * to live here was removed. Only image files are stored in {@code uploads/}
 * (see {@code ImageUploadService}); {@code UploadsSecurityHeadersFilter} adds
 * {@code nosniff} and a sandboxing CSP to every response from this folder.</p>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/")
                .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());
        // Room-type image URLs built by RoomTypeMapper (image.base.url = .../roomtype/)
        registry.addResourceHandler("/roomtype/**")
                .addResourceLocations("file:uploads/roomtype/")
                .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());
    }
}
