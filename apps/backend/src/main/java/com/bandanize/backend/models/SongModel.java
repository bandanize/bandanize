package com.bandanize.backend.models;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import java.util.ArrayList;
import java.util.List;

@Entity
public class SongModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Integer bpm;
    private String songKey; // 'key' is a reserved keyword in some DBs
    private String originalBand;

    @Column(name = "order_index")
    private Integer orderIndex;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "song_list_id")
    @JsonBackReference
    private SongListModel songList;

    @OneToMany(mappedBy = "song", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<TablatureModel> tablatures = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "song_files", joinColumns = @JoinColumn(name = "song_id"))
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

    public Integer getBpm() {
        return bpm;
    }

    public void setBpm(Integer bpm) {
        this.bpm = bpm;
    }

    public String getSongKey() {
        return songKey;
    }

    public void setSongKey(String songKey) {
        this.songKey = songKey;
    }

    public String getOriginalBand() {
        return originalBand;
    }

    public void setOriginalBand(String originalBand) {
        this.originalBand = originalBand;
    }

    public Integer getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(Integer orderIndex) {
        this.orderIndex = orderIndex;
    }

    public SongListModel getSongList() {
        return songList;
    }

    public void setSongList(SongListModel songList) {
        this.songList = songList;
    }

    public List<TablatureModel> getTablatures() {
        return tablatures;
    }

    public void setTablatures(List<TablatureModel> tablatures) {
        this.tablatures = tablatures;
    }

    public List<MediaFile> getFiles() {
        return files;
    }

    public void setFiles(List<MediaFile> files) {
        this.files = files;
    }
}
