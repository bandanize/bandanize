package com.bandanize.backend.models;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
public class BandModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String photo;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String genre;
    private String city;

    @ElementCollection
    @CollectionTable(name = "band_rrss", joinColumns = @JoinColumn(name = "band_id"))
    @MapKeyColumn(name = "platform")
    @Column(name = "url")
    private Map<String, String> rrss = new HashMap<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private UserModel owner;

    @ManyToMany(cascade = { CascadeType.PERSIST, CascadeType.MERGE }, fetch = FetchType.LAZY)
    @JoinTable(name = "band_user", joinColumns = @JoinColumn(name = "band_id"), inverseJoinColumns = @JoinColumn(name = "user_id"))
    private List<UserModel> users = new ArrayList<>();

    @OneToMany(mappedBy = "band", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @com.fasterxml.jackson.annotation.JsonManagedReference
    private List<SongListModel> songLists = new ArrayList<>();

    @OneToMany(mappedBy = "band", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<ChatMessageModel> chatMessages = new ArrayList<>();

    @OneToMany(mappedBy = "band", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<BandInvitationModel> invitations = new ArrayList<>();

    @OneToMany(mappedBy = "band", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Notification> notifications = new ArrayList<>();

    @OneToMany(mappedBy = "band", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<EventModel> events = new ArrayList<>();

    @OneToMany(mappedBy = "band", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<ChatReadStatus> chatReadStatuses = new ArrayList<>();

    @Column(unique = true)
    private String calendarToken;

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

    public List<UserModel> getUsers() {
        return users;
    }

    public void setUsers(List<UserModel> users) {
        this.users = users;
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

    public UserModel getOwner() {
        return owner;
    }

    public void setOwner(UserModel owner) {
        this.owner = owner;
    }

    public List<BandInvitationModel> getInvitations() {
        return invitations;
    }

    public void setInvitations(List<BandInvitationModel> invitations) {
        this.invitations = invitations;
    }

    public List<Notification> getNotifications() {
        return notifications;
    }

    public void setNotifications(List<Notification> notifications) {
        this.notifications = notifications;
    }

    public List<EventModel> getEvents() {
        return events;
    }

    public void setEvents(List<EventModel> events) {
        this.events = events;
    }

    public List<ChatReadStatus> getChatReadStatuses() {
        return chatReadStatuses;
    }

    public void setChatReadStatuses(List<ChatReadStatus> chatReadStatuses) {
        this.chatReadStatuses = chatReadStatuses;
    }

    public String getCalendarToken() {
        return calendarToken;
    }

    public void setCalendarToken(String calendarToken) {
        this.calendarToken = calendarToken;
    }
}