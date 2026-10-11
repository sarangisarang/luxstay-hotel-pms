package com.booksys.roomtype;

import com.booksys.upload.ImageUploadService;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/** Stores room-type pictures in {@code uploads/roomtype/} via {@link ImageUploadService}. */
@Component
public class FileStorageUtil {

    private final ImageUploadService images;

    public FileStorageUtil(ImageUploadService images) {
        this.images = images;
    }

    /**
     * @param filenamePrefix kept for API compatibility; names are random now
     * @return the stored file name
     */
    public String saveFile(MultipartFile file, String filenamePrefix) throws IOException {
        return images.store(file, "roomtype");
    }
}
