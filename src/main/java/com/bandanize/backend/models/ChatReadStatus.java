package com.bandanize.backend.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_read_status", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "band_id" })
})
public class ChatReadStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserModel user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "band_id", nullable = false)
    private BandModel band;

    @Column(nullable = false)
    private LocalDateTime lastReadAt;

    public ChatReadStatus() {
    }

    public ChatReadStatus(UserModel user, BandModel band, LocalDateTime lastReadAt) {
        this.user = user;
        this.band = band;
        this.lastReadAt = lastReadAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UserModel getUser() {
        return user;
    }

    public void setUser(UserModel user) {
        this.user = user;
    }

    public BandModel getBand() {
        return band;
    }

    public void setBand(BandModel band) {
        this.band = band;
    }

    public LocalDateTime getLastReadAt() {
        return lastReadAt;
    }

    public void setLastReadAt(LocalDateTime lastReadAt) {
        this.lastReadAt = lastReadAt;
    }
}
