package com.bandanize.backend.services;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

/**
 * Service responsible for handling file storage operations.
 * Delegates the actual storage to an external Content Manager Service.
 */
@Service
public class StorageService {

    private final FileStorageService fileStorageService;

    @org.springframework.beans.factory.annotation.Autowired
    public StorageService(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    /**
     * Uploads a file using the configured FileStorageService.
     *
     * @param file   The file to upload.
     * @param folder The target folder (e.g., "images", "audio").
     * @return The filename of the stored file.
     * @throws IOException If file access fails.
     */
    public String uploadFile(MultipartFile file, String folder) throws IOException {
        return fileStorageService.store(file, folder);
    }

    public void deleteFile(String filename, String folder) {
        fileStorageService.delete(filename, folder);
    }

    public String storeChunk(MultipartFile file, String uploadId, int chunkIndex, int totalChunks,
            String originalFilename, String folder) {
        return fileStorageService.storeChunk(file, uploadId, chunkIndex, totalChunks, originalFilename, folder);
    }
}
