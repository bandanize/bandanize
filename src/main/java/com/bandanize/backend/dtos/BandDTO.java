package com.bandanize.backend.dtos;

import com.bandanize.backend.models.ChatMessageModel;
import com.bandanize.backend.models.SongListModel;
import java.util.List;
import java.util.Map;

public class BandDTO {
    private Long id;
    private String name;
    private String photo;
    private String description;
    private String genre;
    private String city;
    private Long ownerId;
    private Map<String, String> rrss;
    private List<UserSummaryDTO> members;
    private List<SongListModel> songLists;
    private List<ChatMessageModel> chatMessages;

    // Getters y setters
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

    public String getPhoto() {
        return photo;
    }

    public void setPhoto(String photo) {
        this.photo = photo;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getGenre() {
        return genre;
    }

    public void setGenre(String genre) {
        this.genre = genre;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public Map<String, String> getRrss() {
        return rrss;
    }

    public void setRrss(Map<String, String> rrss) {
        this.rrss = rrss;
    }

    public List<UserSummaryDTO> getMembers() {
        return members;
    }

    public void setMembers(List<UserSummaryDTO> members) {
        this.members = members;
    }

    public List<SongListModel> getSongLists() {
        return songLists;
    }

    public void setSongLists(List<SongListModel> songLists) {
        this.songLists = songLists;
    }

    public List<ChatMessageModel> getChatMessages() {
        return chatMessages;
    }

    public void setChatMessages(List<ChatMessageModel> chatMessages) {
        this.chatMessages = chatMessages;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(Long ownerId) {
        this.ownerId = ownerId;
    }
}