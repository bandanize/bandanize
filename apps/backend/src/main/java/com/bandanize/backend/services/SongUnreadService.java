package com.bandanize.backend.services;

import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.*;
import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;

@Service
public class SongUnreadService {
    private static final List<String> KINDS = List.of("tabs", "files", "comments");
    private final SongRepository songs;
    private final BandRepository bands;
    private final UserRepository users;
    private final TabCommentRepository comments;
    private final SongReadStateRepository states;
    private final ObjectMapper json;
    public SongUnreadService(SongRepository songs, BandRepository bands, UserRepository users,
            TabCommentRepository comments, SongReadStateRepository states, ObjectMapper json) {
        this.songs = songs; this.bands = bands; this.users = users;
        this.comments = comments; this.states = states; this.json = json;
    }
    public record Unread(Long songId, Set<String> tabs, Set<String> files, Set<String> comments) {}
    private Map<String, Set<String>> empty() {
        Map<String, Set<String>> result = new LinkedHashMap<>();
        KINDS.forEach(kind -> result.put(kind, new LinkedHashSet<>()));
        return result;
    }
    private void requireAccess(BandModel band, Long userId) {
        if ((band.getOwner() == null || !userId.equals(band.getOwner().getId()))
                && band.getUsers().stream().noneMatch(user -> userId.equals(user.getId())))
            throw new AccessDeniedException("You must belong to this project.");
    }
    private Map<String, Set<String>> parse(SongReadState state) {
        if (state == null) return empty();
        try {
            Map<String, Set<String>> value = json.readValue(state.getSeen(), new TypeReference<>() {});
            Map<String, Set<String>> result = empty();
            KINDS.forEach(kind -> { if (value.get(kind) != null) result.get(kind).addAll(value.get(kind)); });
            return result;
        } catch (java.io.IOException e) { throw new IllegalStateException("Invalid song read state", e); }
    }
    private Map<String, Set<String>> resources(SongModel song, List<TabCommentRepository.ActivityId> activity, Long userId) {
        Map<String, Set<String>> result = empty();
        song.getFiles().forEach(file -> result.get("files").add("song:" + file.getUrl()));
        song.getTablatures().forEach(tab -> {
            result.get("tabs").add(tab.getId().toString());
            tab.getFiles().forEach(file -> result.get("files").add("tab:" + tab.getId() + ":" + file.getUrl()));
        });
        activity.stream().filter(item -> song.getId().equals(item.getSongId()) && !userId.equals(item.getSenderId()))
            .forEach(item -> result.get("comments").add(item.getId().toString()));
        return result;
    }
    @Transactional(readOnly = true)
    public List<Unread> unread(Long bandId, Long userId) {
        BandModel band = bands.findById(bandId).orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        requireAccess(band, userId);
        Map<Long, SongReadState> bySong = new HashMap<>();
        states.findByUserIdAndSongBandId(userId, bandId).forEach(state -> bySong.put(state.getSong().getId(), state));
        var activity = comments.findActivityIds(bandId);
        return songs.findByBandId(bandId).stream().map(song -> {
            var current = resources(song, activity, userId);
            var seen = parse(bySong.get(song.getId()));
            KINDS.forEach(kind -> current.get(kind).removeAll(seen.get(kind)));
            return new Unread(song.getId(), current.get("tabs"), current.get("files"), current.get("comments"));
        }).toList();
    }
    @Transactional
    public void seen(Long songId, Long userId, Map<String, List<String>> observed) {
        if (observed == null || observed.keySet().stream().anyMatch(kind -> !KINDS.contains(kind))
                || observed.values().stream().anyMatch(values -> values == null || values.size() > 500
                    || values.stream().anyMatch(value -> value == null || value.length() > 4096)))
            throw new IllegalArgumentException("Invalid read receipt");
        // Serialize receipts from multiple tabs/devices, including the first insert.
        UserModel user = users.findByIdForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        SongModel song = songs.findById(songId).orElseThrow(() -> new ResourceNotFoundException("Song not found"));
        requireAccess(song.getBand(), userId);
        var current = resources(song, comments.findActivityIds(song.getBand().getId()), userId);
        SongReadState state = states.findByUserIdAndSongId(userId, songId).orElseGet(() -> {
            SongReadState created = new SongReadState(); created.setUser(user); created.setSong(song); return created;
        });
        var seen = parse(state);
        KINDS.forEach(kind -> {
            seen.get(kind).addAll(observed.getOrDefault(kind, List.of()));
            // Unknown/future IDs cannot be pre-acknowledged. Deleted items do not accumulate.
            seen.get(kind).retainAll(current.get(kind));
        });
        try { state.setSeen(json.writeValueAsString(seen)); }
        catch (java.io.IOException e) { throw new IllegalStateException("Could not save read state", e); }
        states.save(state);
    }
}
