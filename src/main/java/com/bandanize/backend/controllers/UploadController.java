package com.bandanize.backend.controllers;

import com.bandanize.backend.services.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * REST Controller for handling file uploads.
 * Exposes endpoints for uploading images, audio, video, and generic files.
 */
@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final Logger logger = LoggerFactory.getLogger(UploadController.class);

    private final StorageService storageService;

    @Autowired
    public UploadController(StorageService storageService) {
        this.storageService = storageService;
    }

    /**
     * Uploads an image file.
     *
     * @param file The image file to upload.
     * @return ResponseEntity with the upload status.
     */
    @PostMapping("/image")
    public ResponseEntity<String> uploadImage(@RequestParam("file") MultipartFile file) {
        return uploadFileInternal(file, "images");
    }

    /**
     * Uploads an audio file.
     *
     * @param file The audio file to upload.
     * @return ResponseEntity with the upload status.
     */
    @PostMapping("/audio")
    public ResponseEntity<String> uploadAudio(@RequestParam("file") MultipartFile file) {
        return uploadFileInternal(file, "audio");
    }

    /**
     * Uploads a video file.
     *
     * @param file The video file to upload.
     * @return ResponseEntity with the upload status.
     */
    @PostMapping("/video")
    public ResponseEntity<String> uploadVideo(@RequestParam("file") MultipartFile file) {
        return uploadFileInternal(file, "videos");
    }

    /**
     * Uploads a generic file.
     *
     * @param file The file to upload.
     * @return ResponseEntity with the upload status.
     */
    @PostMapping("/file")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        return uploadFileInternal(file, "files");
    }

    /**
     * Internal helper method to delegate the upload to the service.
     */
    private ResponseEntity<String> uploadFileInternal(MultipartFile file, String folder) {
        try {
            String filename = storageService.uploadFile(file, folder);
            // Return just the filename so frontend can easily use it
            return ResponseEntity.ok(filename);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error uploading file: " + e.getMessage());
        }
    }

    /**
     * Uploads a chunk of a file.
     *
     * @param file             The chunk file.
     * @param chunkIndex       The index of the chunk.
     * @param totalChunks      The total number of chunks.
     * @param uploadId         The unique ID for this upload session.
     * @param originalFilename The original filename.
     * @param folder           The target folder (optional, defaults to 'files').
     * @return ResponseEntity with the upload status.
     */
    @PostMapping("/chunk")
    public ResponseEntity<String> uploadChunk(
            @RequestParam("file") MultipartFile file,
            @RequestParam("chunkIndex") int chunkIndex,
            @RequestParam("totalChunks") int totalChunks,
            @RequestParam("uploadId") String uploadId,
            @RequestParam("originalFilename") String originalFilename,
            @RequestParam(value = "folder", defaultValue = "files") String folder) {
        try {
            // Map frontend folder names to backend folder names if needed
            String targetFolder = folder;
            if ("image".equals(folder))
                targetFolder = "images";
            else if ("audio".equals(folder))
                targetFolder = "audio"; // singular in backend
            else if ("video".equals(folder))
                targetFolder = "videos";
            else if ("file".equals(folder))
                targetFolder = "files";

            String result = storageService.storeChunk(file, uploadId, chunkIndex, totalChunks, originalFilename,
                    targetFolder);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error uploading chunk: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error uploading chunk: " + e.getMessage());
        }
    }
}