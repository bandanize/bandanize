package com.bandanize.backend.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "tab_comments")
public class TabCommentModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tablature_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private TablatureModel tablature;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({ "bands", "hashedPassword", "rrss", "hibernateLazyInitializer", "handler" })
    private UserModel sender;

    @Column(columnDefinition = "TEXT")
    private String message;

    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    private Integer anchorStart;
    private Integer anchorEnd;
    @Column(columnDefinition = "TEXT")
    private String quote;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "tab_comment_attachments", joinColumns = @JoinColumn(name = "comment_id"))
    private java.util.List<MediaFile> attachments = new java.util.ArrayList<>();

    public Integer getAnchorStart() { return anchorStart; }
    public void setAnchorStart(Integer value) { anchorStart = value; }
    public Integer getAnchorEnd() { return anchorEnd; }
    public void setAnchorEnd(Integer value) { anchorEnd = value; }
    public String getQuote() { return quote; }
    public void setQuote(String value) { quote = value; }
    public java.util.List<MediaFile> getAttachments() { return attachments; }
    public void setAttachments(java.util.List<MediaFile> value) { attachments = value; }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TablatureModel getTablature() {
        return tablature;
    }

    public void setTablature(TablatureModel tablature) {
        this.tablature = tablature;
    }

    public UserModel getSender() {
        return sender;
    }

    public void setSender(UserModel sender) {
        this.sender = sender;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
