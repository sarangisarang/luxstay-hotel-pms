package com.booksys.upload;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Defence in depth for files served from {@code uploads/}: even if a
 * non-image file is still in the folder (uploaded before validation existed),
 * the browser must not run it as a web page. {@code sandbox} disables scripts
 * and gives the response a unique origin; {@code nosniff} stops content-type
 * guessing.
 */
@Component
public class UploadsSecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String p = request.getRequestURI();
        return !(p.startsWith("/uploads/") || p.startsWith("/roomtype/")
                || p.startsWith("/api/images/files/") || p.startsWith("/api/room-types/roomtype/"));
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; sandbox");
        chain.doFilter(request, response);
    }
}
