package com.booksys.roomtype;
import jakarta.validation.constraints.NotNull;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.Objects;

@Component
public class FileStorageUtil {

    public String saveFile(@NotNull MultipartFile file, String filenamePrefix) throws IOException {

        if (file.isEmpty()) throw new RuntimeException("Empty file");
        String originalName = Path.of(Objects.requireNonNull(file.getOriginalFilename())).getFileName().toString();
        String extension = originalName.substring(originalName.lastIndexOf("."));
        String filename = filenamePrefix + "_" + System.currentTimeMillis() + extension;
        Path dirPath = Paths.get("uploads/roomtype");

        if (!Files.exists(dirPath)) Files.createDirectories(dirPath);
        Path filePath = dirPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        return filename;
    }
}
