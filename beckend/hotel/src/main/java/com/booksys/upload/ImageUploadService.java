package com.booksys.upload;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * The only way files get into {@code uploads/}. Every upload endpoint used to
 * write the client's file name as-is ({@code ../../} path traversal) and
 * accepted any type, so an uploaded {@code .html} file was served publicly as
 * a web page (stored XSS).
 *
 * <ul>
 *   <li>only JPEG, PNG, GIF and WebP, recognised by their file signature
 *       (magic bytes), never by the name or the browser-supplied type</li>
 *   <li>at most {@value #MAX_BYTES} bytes</li>
 *   <li>stored under a random name with the extension of the detected type</li>
 * </ul>
 */
@Service
public class ImageUploadService {

    public static final long MAX_BYTES = 5L * 1024 * 1024;

    /** Names this service generates (and the only names the image endpoints serve). */
    private static final Pattern SAFE_NAME = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$");

    private final Path root;

    public ImageUploadService() {
        this(Paths.get("uploads"));
    }

    ImageUploadService(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    /** Image types we accept, with their canonical extension. */
    public enum ImageType {
        JPEG("jpg", MediaType.IMAGE_JPEG),
        PNG("png", MediaType.IMAGE_PNG),
        GIF("gif", MediaType.IMAGE_GIF),
        WEBP("webp", MediaType.parseMediaType("image/webp"));

        public final String extension;
        public final MediaType mediaType;

        ImageType(String extension, MediaType mediaType) {
            this.extension = extension;
            this.mediaType = mediaType;
        }
    }

    /**
     * Validates and stores an image.
     *
     * @param subfolder folder below {@code uploads/} ("" or e.g. "roomtype")
     * @return the stored file name (without folder), e.g. {@code 3f2c….jpg}
     * @throws IllegalArgumentException (HTTP 400) when the file is missing, too large or not an image
     */
    public String store(MultipartFile file, String subfolder) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please choose an image file");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("The image must be at most 5 MB");
        }
        byte[] bytes;
        try (InputStream in = file.getInputStream()) {
            bytes = in.readNBytes((int) MAX_BYTES + 1);
        }
        if (bytes.length > MAX_BYTES) {
            throw new IllegalArgumentException("The image must be at most 5 MB");
        }
        ImageType type = detect(bytes).orElseThrow(() ->
                new IllegalArgumentException("Only JPEG, PNG, GIF or WebP images can be uploaded"));

        Path dir = folder(subfolder);
        Files.createDirectories(dir);
        String name = UUID.randomUUID() + "." + type.extension;
        Files.write(dir.resolve(name), bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        return name;
    }

    /**
     * Resolves a stored image for download, refusing anything that is not a
     * plain file name of an image inside the folder.
     */
    public Optional<Path> find(String subfolder, String filename) {
        if (filename == null || !SAFE_NAME.matcher(filename).matches() || mediaTypeOf(filename).isEmpty()) {
            return Optional.empty();
        }
        Path dir = folder(subfolder);
        Path path = dir.resolve(filename).normalize();
        if (!path.startsWith(dir) || !Files.isRegularFile(path)) {
            return Optional.empty();
        }
        return Optional.of(path);
    }

    /** Deletes a previously stored image (ignores names this service would not have created). */
    public void deleteQuietly(String subfolder, String filename) {
        find(subfolder, filename).ifPresent(p -> {
            try {
                Files.deleteIfExists(p);
            } catch (IOException ignored) {
                // a leftover file is harmless
            }
        });
    }

    /** Content type by extension, for image files only. */
    public static Optional<MediaType> mediaTypeOf(String filename) {
        String lower = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return Optional.of(MediaType.IMAGE_JPEG);
        if (lower.endsWith(".png")) return Optional.of(MediaType.IMAGE_PNG);
        if (lower.endsWith(".gif")) return Optional.of(MediaType.IMAGE_GIF);
        if (lower.endsWith(".webp")) return Optional.of(MediaType.parseMediaType("image/webp"));
        return Optional.empty();
    }

    /** Recognises the image type from the first bytes of the file. */
    static Optional<ImageType> detect(byte[] b) {
        if (startsWith(b, 0xFF, 0xD8, 0xFF)) return Optional.of(ImageType.JPEG);
        if (startsWith(b, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) return Optional.of(ImageType.PNG);
        if (startsWith(b, 'G', 'I', 'F', '8') && b.length > 5 && (b[4] == '7' || b[4] == '9') && b[5] == 'a') {
            return Optional.of(ImageType.GIF);
        }
        if (startsWith(b, 'R', 'I', 'F', 'F') && b.length >= 12
                && Arrays.equals(Arrays.copyOfRange(b, 8, 12), new byte[]{'W', 'E', 'B', 'P'})) {
            return Optional.of(ImageType.WEBP);
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] b, int... prefix) {
        if (b.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if ((b[i] & 0xFF) != prefix[i]) return false;
        }
        return true;
    }

    private Path folder(String subfolder) {
        String sub = subfolder == null ? "" : subfolder;
        if (!sub.isEmpty() && !sub.matches("[a-z0-9-]+")) {
            throw new IllegalArgumentException("Invalid upload folder");
        }
        Path dir = root.resolve(sub).normalize();
        if (!dir.startsWith(root)) throw new IllegalArgumentException("Invalid upload folder");
        return dir;
    }
}
