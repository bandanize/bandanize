package com.bandanize.backend.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.*;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class ChunkUploadRecoveryTest {
    @TempDir Path root;
    private LocalStorageService storage() {
        LocalStorageService storage = new LocalStorageService();
        ReflectionTestUtils.setField(storage, "storageLocation", root.toString());
        storage.init();
        return storage;
    }
    private MockMultipartFile chunk(String text) {
        return new MockMultipartFile("file", "blob", "application/octet-stream", text.getBytes());
    }
    @Test void finalChunkRetryAfterLostResponseAndRestartReturnsSameCompleteFile() throws Exception {
        var service = storage();
        String id = UUID.randomUUID().toString();
        assertEquals("Chunk received", service.storeChunk(chunk("first"), id, 0, 2, "demo.mp3", "audio"));
        String filename = service.storeChunk(chunk("second"), id, 1, 2, "demo.mp3", "audio");
        assertEquals("firstsecond", Files.readString(root.resolve("audio").resolve(filename)));
        assertEquals(filename, storage().storeChunk(chunk("second"), id, 1, 2, "demo.mp3", "audio"));
        try (var files = Files.list(root.resolve("audio"))) { assertEquals(1, files.count()); }
    }
    @Test void outOfOrderAndRepeatedChunksAssembleOnce() throws Exception {
        var service = storage(); String id = UUID.randomUUID().toString();
        assertEquals("Chunk received", service.storeChunk(chunk("B"), id, 1, 2, "notes.pdf", "files"));
        assertEquals("Chunk received", service.storeChunk(chunk("B"), id, 1, 2, "notes.pdf", "files"));
        String filename = service.storeChunk(chunk("A"), id, 0, 2, "notes.pdf", "files");
        assertEquals("AB", Files.readString(root.resolve("files").resolve(filename)));
    }
    @Test void rejectsTraversalAndChangedSessionBeforeWriting() {
        var service = storage(); String id = UUID.randomUUID().toString();
        assertThrows(IllegalArgumentException.class, () -> service.storeChunk(chunk("A"), "../bad", 0, 1, "x", "files"));
        assertThrows(IllegalArgumentException.class, () -> service.storeChunk(chunk("A"), id, 0, 1, "../x", "files"));
        assertThrows(IllegalArgumentException.class, () -> service.storeChunk(chunk("A"), id, 0, 1, "x", "../files"));
        service.storeChunk(chunk("A"), id, 0, 2, "x", "files");
        assertThrows(IllegalArgumentException.class, () -> service.storeChunk(chunk("B"), id, 1, 3, "x", "files"));
    }
}
