package com.bandanize.backend.dtos;

import com.bandanize.backend.models.MediaFile;
import java.util.List;

public record TabCommentRequest(String message, Integer anchorStart, Integer anchorEnd,
        String quote, List<MediaFile> attachments) {}
