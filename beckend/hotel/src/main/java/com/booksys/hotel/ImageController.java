package com.booksys.hotel;

import com.booksys.upload.ImageUploadService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/** Image upload and download for the admin UI (validated by {@link ImageUploadService}). */
@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final ImageUploadService images;

    public ImageController(ImageUploadService images) {
        this.images = images;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        String name = images.store(file, "");
        return ResponseEntity.ok(Map.of("imageUrl", "/api/images/files/" + name));
    }

    /** Serves stored images only: no path traversal, image content types only. */
    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> getFile(@PathVariable String filename) {
        return images.find("", filename)
                .<ResponseEntity<Resource>>map(path -> ResponseEntity.ok()
                        .contentType(ImageUploadService.mediaTypeOf(filename).orElseThrow())
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                        .body(new FileSystemResource(path)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
