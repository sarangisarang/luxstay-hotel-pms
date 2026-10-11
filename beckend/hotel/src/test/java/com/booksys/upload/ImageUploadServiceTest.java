package com.booksys.upload;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class ImageUploadServiceTest {

    @TempDir Path root;

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16};

    @Test
    void storesImagesUnderRandomNameWithDetectedExtension() throws Exception {
        ImageUploadService service = new ImageUploadService(root);
        // the client's name and type are ignored: content decides
        String name = service.store(new MockMultipartFile("file", "../../evil.html", "text/html", PNG), "");
        assertTrue(name.matches("[0-9a-f-]{36}\\.png"), name);
        assertTrue(Files.exists(root.resolve(name)));

        String jpg = service.store(new MockMultipartFile("file", "x.png", "image/png", JPEG), "roomtype");
        assertTrue(jpg.endsWith(".jpg"));
        assertTrue(Files.exists(root.resolve("roomtype").resolve(jpg)));
    }

    @Test
    void rejectsNonImagesEmptyAndOversizedFiles() {
        ImageUploadService service = new ImageUploadService(root);
        byte[] html = "<html><script>alert(1)</script></html>".getBytes();
        byte[] svg = "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>".getBytes();
        assertThrows(IllegalArgumentException.class,
                () -> service.store(new MockMultipartFile("file", "a.jpg", "image/jpeg", html), ""));
        assertThrows(IllegalArgumentException.class,
                () -> service.store(new MockMultipartFile("file", "a.svg", "image/svg+xml", svg), ""));
        assertThrows(IllegalArgumentException.class,
                () -> service.store(new MockMultipartFile("file", "a.png", "image/png", new byte[0]), ""));
        byte[] big = new byte[(int) ImageUploadService.MAX_BYTES + 10];
        System.arraycopy(PNG, 0, big, 0, PNG.length);
        assertThrows(IllegalArgumentException.class,
                () -> service.store(new MockMultipartFile("file", "a.png", "image/png", big), ""));
        assertThrows(IllegalArgumentException.class,
                () -> service.store(new MockMultipartFile("file", "a.png", "image/png", PNG), "../etc"));
    }

    @Test
    void findRefusesTraversalAndNonImageNames() throws Exception {
        ImageUploadService service = new ImageUploadService(root);
        String name = service.store(new MockMultipartFile("file", "a.png", "image/png", PNG), "");
        Files.writeString(root.resolve("page.html"), "<script>alert(1)</script>");

        assertTrue(service.find("", name).isPresent());
        assertTrue(service.find("", "page.html").isEmpty());
        assertTrue(service.find("", "../" + name).isEmpty());
        assertTrue(service.find("", "..%2F" + name).isEmpty());
        assertTrue(service.find("", "missing.png").isEmpty());
    }
}
