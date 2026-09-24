package com.bandanize.backend.models;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "song_read_state", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "song_id"}))
public class SongReadState {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private UserModel user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "song_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SongModel song;
    @Column(columnDefinition = "TEXT", nullable = false)
    private String seen = "{}";
    public UserModel getUser() { return user; }
    public void setUser(UserModel user) { this.user = user; }
    public SongModel getSong() { return song; }
    public void setSong(SongModel song) { this.song = song; }
    public String getSeen() { return seen; }
    public void setSeen(String seen) { this.seen = seen; }
}
