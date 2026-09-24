package com.bandanize.backend.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "events")
public class EventModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private LocalDateTime date;

    private String timeZone;
    private java.time.Instant updatedAt;
    private Integer sequence;

    @Column(name = "event_type", nullable = false, columnDefinition = "varchar(255) default 'OTRO'")
    private String type = "OTRO"; // CONCIERTO, ENSAYO, OTRO

    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "band_id", nullable = false)
    private BandModel band;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id")
    private UserModel creator;

    private LocalDateTime createdAt;

    public EventModel() {
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    void initializeCalendarRevision() { updatedAt = java.time.Instant.now(); sequence = 0; }

    @PreUpdate
    void updateCalendarRevision() { updatedAt = java.time.Instant.now(); sequence = getSequence() + 1; }

    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String timeZone) { this.timeZone = timeZone; }
    public String effectiveTimeZone() { return timeZone == null || timeZone.isBlank() ? "Europe/Madrid" : timeZone; }
    public java.time.Instant getUpdatedAt() { return updatedAt; }
    public int getSequence() { return sequence == null ? 0 : sequence; }

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

    public BandModel getBand() {
        return band;
    }

    public void setBand(BandModel band) {
        this.band = band;
    }

    public UserModel getCreator() {
        return creator;
    }

    public void setCreator(UserModel creator) {
        this.creator = creator;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
