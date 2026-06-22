package com.booksys.hotel;

import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

public interface ImageService {
    String save(MultipartFile file, UUID hotelId);
}

