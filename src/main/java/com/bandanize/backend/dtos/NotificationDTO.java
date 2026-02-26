package com.bandanize.backend.dtos;

import java.time.LocalDateTime;
import java.util.Map;

public class NotificationDTO {
    private Long id;
    private String type;
    private Map<String, String> metadata;
    private LocalDateTime createdAt;
    private UserSummaryDTO actor;
    private String title;
    private String message;
    @com.fasterxml.jackson.annotation.JsonProperty("isRead")
    private boolean isRead;

    public NotificationDTO() {
    }

    public NotificationDTO(Long id, String type, Map<String, String> metadata, LocalDateTime createdAt,
            UserSummaryDTO actor, String title, String message, boolean isRead) {
        this.id = id;
        this.type = type;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.actor = actor;
        this.title = title;
        this.message = message;
        this.isRead = isRead;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Map<String, String> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, String> metadata) {
        this.metadata = metadata;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public UserSummaryDTO getActor() {
        return actor;
    }

    public void setActor(UserSummaryDTO actor) {
        this.actor = actor;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        isRead = read;
    }
}
