package com.bandanize.backend.dtos;

import java.time.LocalDateTime;

public class EventDTO {
    private Long id;
    private String name;
    private String description;
    private LocalDateTime date;
    private String type;
    private String location;
    private Long creatorId;
    private String creatorName;
    private LocalDateTime createdAt;

    public EventDTO() {
    }

    public EventDTO(Long id, String name, String description, LocalDateTime date, String type,
            String location, Long creatorId, String creatorName, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.date = date;
        this.type = type;
        this.location = location;
        this.creatorId = creatorId;
        this.creatorName = creatorName;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getDate() {
        return date;
    }

    public void setDate(LocalDateTime date) {
        this.date = date;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Long getCreatorId() {
        return creatorId;
    }

    public void setCreatorId(Long creatorId) {
        this.creatorId = creatorId;
    }

    public String getCreatorName() {
        return creatorName;
    }

    public void setCreatorName(String creatorName) {
        this.creatorName = creatorName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public static EventDTO fromModel(com.bandanize.backend.models.EventModel event) {
        return new EventDTO(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getDate(),
                event.getType(),
                event.getLocation(),
                event.getCreator() != null ? event.getCreator().getId() : null,
                event.getCreator() != null ? event.getCreator().getName() : null,
                event.getCreatedAt());
    }
}
