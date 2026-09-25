package com.bandanize.backend.models;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.util.ArrayList;
import java.util.List;

@Entity
@org.hibernate.annotations.DynamicUpdate
public class TablatureModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private Long editOwnerId;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String editOwnerName;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String editToken;
    @com.fasterxml.jackson.annotation.JsonIgnore
    private java.time.Instant editExpiresAt;

    private String name;
    private String instrument;
    private String instrumentIcon;
    private String tuning;

    @Column(columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "song_id")
    @JsonBackReference
    private SongModel song;

    @OneToMany(mappedBy = "tablature", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TabCommentModel> comments = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tablature_files", joinColumns = @JoinColumn(name = "tablature_id"))
    @org.hibernate.annotations.BatchSize(size = 64)
    private List<MediaFile> files = new ArrayList<>();

    @com.fasterxml.jackson.annotation.JsonIgnore
    public Long getEditOwnerId() { return editOwnerId; }
    public void setEditOwnerId(Long value) { editOwnerId = value; }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getEditOwnerName() { return editOwnerName; }
    public void setEditOwnerName(String value) { editOwnerName = value; }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getEditToken() { return editToken; }
    public void setEditToken(String value) { editToken = value; }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public java.time.Instant getEditExpiresAt() { return editExpiresAt; }
    public void setEditExpiresAt(java.time.Instant value) { editExpiresAt = value; }

    public int getCommentCount() {
        return comments.size();
    }

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

    public String getInstrument() {
        return instrument;
    }

    public void setInstrument(String instrument) {
        this.instrument = instrument;
    }

    public String getInstrumentIcon() {
        return instrumentIcon;
    }

    public void setInstrumentIcon(String instrumentIcon) {
        this.instrumentIcon = instrumentIcon;
    }

    public String getTuning() {
        return tuning;
    }

    public void setTuning(String tuning) {
        this.tuning = tuning;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public SongModel getSong() {
        return song;
    }

    public void setSong(SongModel song) {
        this.song = song;
    }

    public List<MediaFile> getFiles() {
        return files;
    }

    public void setFiles(List<MediaFile> files) {
        this.files = files;
    }
}
