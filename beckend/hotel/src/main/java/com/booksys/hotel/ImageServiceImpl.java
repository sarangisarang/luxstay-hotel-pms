package com.booksys.hotel;

import com.booksys.upload.ImageUploadService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;

/** Stores hotel pictures via {@link ImageUploadService} (validated, random file name). */
@Service
public class ImageServiceImpl implements ImageService {

    private final ImageUploadService images;

    public ImageServiceImpl(ImageUploadService images) {
        this.images = images;
    }

    @Override
    public String save(MultipartFile file, UUID hotelId) {
        try {
            return images.store(file, "");
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store the image", e);
        }
    }
}
