package com.bandanize.backend.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class BandInvitationModel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "band_id", nullable = false)
    private BandModel band;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private UserModel invitedUser;

    @Enumerated(EnumType.STRING)
    private InvitationStatus status = InvitationStatus.PENDING;

    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public BandModel getBand() {
        return band;
    }

    public void setBand(BandModel band) {
        this.band = band;
    }

    public UserModel getInvitedUser() {
        return invitedUser;
    }

    public void setInvitedUser(UserModel invitedUser) {
        this.invitedUser = invitedUser;
    }

    public InvitationStatus getStatus() {
        return status;
    }

    public void setStatus(InvitationStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
