package com.booksys.upload;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Generic image upload (ADMIN). Files are validated and renamed by
 * {@link ImageUploadService}; the client's file name is never used on disk.
 */
@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private final ImageUploadService images;
    private final String serverUrl;

    public UploadController(ImageUploadService images,
                            @Value("${app.server.url:http://localhost:8080}") String serverUrl) {
        this.images = images;
        this.serverUrl = serverUrl.replaceAll("/+$", "");
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
        String name = images.store(file, "");
        return ResponseEntity.ok(Map.of("url", serverUrl + "/uploads/" + name));
    }
}
