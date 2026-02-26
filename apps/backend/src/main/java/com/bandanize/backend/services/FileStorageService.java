package com.bandanize.backend.services;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface FileStorageService {
    String store(MultipartFile file, String folder);

    Resource load(String filename, String folder);

    void delete(String filename, String folder);

    String storeChunk(MultipartFile file, String uploadId, int chunkIndex, int totalChunks, String originalFilename,
            String folder);
}
