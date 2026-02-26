package com.bandanize.backend.models;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.util.ArrayList;
import java.util.List;

@Entity
public class TablatureModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    @ElementCollection
    @CollectionTable(name = "tablature_files", joinColumns = @JoinColumn(name = "tablature_id"))
    private List<MediaFile> files = new ArrayList<>();

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
