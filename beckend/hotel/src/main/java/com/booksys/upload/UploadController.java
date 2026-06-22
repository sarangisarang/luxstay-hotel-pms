package com.booksys.upload;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final Logger logger = LoggerFactory.getLogger(UploadController.class);

    @Value("${app.server.url:http://localhost:8080}")
    private String serverUrl;

    @PostMapping
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        Map<String, String> response = new HashMap<>();

        if (file.isEmpty()) {
            response.put("error", "File is empty");
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }
        try {
            String uploadDir = System.getProperty("user.dir") + "/uploads/";
            File directory = new File(uploadDir);
            if (!directory.exists()) {
                boolean created = directory.mkdirs();
                if (!created) {
                    response.put("error", "Failed to create upload directory");
                    return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
                }
            }
            String filePath = uploadDir + file.getOriginalFilename();
            file.transferTo(new File(filePath));
            response.put("url", serverUrl + "/uploads/" + file.getOriginalFilename());
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IOException e) {
            logger.error("Failed to upload file", e);
            response.put("error", "Failed to upload file: " + e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
