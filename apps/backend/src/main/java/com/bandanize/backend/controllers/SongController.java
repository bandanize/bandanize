package com.bandanize.backend.controllers;

import com.bandanize.backend.models.*;
import com.bandanize.backend.services.SongService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.repositories.UserRepository;
import java.security.Principal;

@RestController
@RequestMapping("/api")
public class SongController {

    private static final Logger logger = LoggerFactory.getLogger(SongController.class);

    @Autowired
    private SongService songService;

    @Autowired
    private UserRepository userRepository;

    private Long getCurrentUserId(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found")).getId();
    }

    // --- Song Lists ---
    @PostMapping("/bands/{bandId}/songlists")
    public ResponseEntity<SongListModel> createSongList(@PathVariable Long bandId,
            @RequestBody SongListModel songList, Principal principal) {
        return ResponseEntity.ok(songService.createSongList(bandId, getCurrentUserId(principal), songList));
    }

    @GetMapping("/bands/{bandId}/songlists")
    public ResponseEntity<List<SongListModel>> getSongLists(@PathVariable Long bandId) {
        return ResponseEntity.ok(songService.getSongListsByBand(bandId));
    }

    @PutMapping("/songlists/{listId}")
    public ResponseEntity<SongListModel> updateSongList(@PathVariable Long listId, @RequestBody SongListModel details) {
        return ResponseEntity.ok(songService.updateSongList(listId, details));
    }

    @DeleteMapping("/songlists/{listId}")
    public ResponseEntity<Void> deleteSongList(@PathVariable Long listId) {
        songService.deleteSongList(listId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/songlists/{listId}/reorder")
    public ResponseEntity<Void> reorderSongs(@PathVariable Long listId, @RequestBody List<Long> songIds) {
        songService.reorderSongs(listId, songIds);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/bands/{bandId}/songlists/reorder")
    public ResponseEntity<Void> reorderSongLists(@PathVariable Long bandId, @RequestBody List<Long> listIds) {
        songService.reorderSongLists(bandId, listIds);
        return ResponseEntity.ok().build();
    }

    // --- Songs ---
    @PostMapping("/songlists/{listId}/songs")
    public ResponseEntity<SongModel> addSong(@PathVariable Long listId, @RequestBody SongModel song,
            Principal principal) {
        return ResponseEntity.ok(songService.addSong(listId, getCurrentUserId(principal), song));
    }

    @PutMapping("/songs/{songId}")
    public ResponseEntity<SongModel> updateSong(@PathVariable Long songId,
            @RequestBody java.util.Map<String, Object> updates) {
        return ResponseEntity.ok(songService.updateSong(songId, updates));
    }

    @DeleteMapping("/songs/{songId}")
    public ResponseEntity<Void> deleteSong(@PathVariable Long songId) {
        songService.deleteSong(songId);
        return ResponseEntity.ok().build();
    }

    // --- Tablatures ---
    @PostMapping("/songs/{songId}/tabs")
    public ResponseEntity<TablatureModel> addTablature(@PathVariable Long songId, @RequestBody TablatureModel tab) {
        return ResponseEntity.ok(songService.addTablature(songId, tab));
    }

    @PutMapping("/tabs/{tabId}")
    public ResponseEntity<TablatureModel> updateTablature(@PathVariable Long tabId,
            @RequestBody TablatureModel details) {
        logger.debug("Received update for tabId: {}, name={}, instrument={}", tabId, details.getName(),
                details.getInstrument());
        return ResponseEntity.ok(songService.updateTablature(tabId, details));
    }

    @DeleteMapping("/tabs/{tabId}")
    public ResponseEntity<Void> deleteTablature(@PathVariable Long tabId) {
        songService.deleteTablature(tabId);
        return ResponseEntity.ok().build();
    }

    // --- Media Files ---
    @PostMapping("/songs/{songId}/files")
    public ResponseEntity<SongModel> addSongFile(@PathVariable Long songId, @RequestBody MediaFile file) {
        return ResponseEntity.ok(songService.addFileToSong(songId, file));
    }

    @PostMapping("/tabs/{tabId}/files")
    public ResponseEntity<TablatureModel> addTablatureFile(@PathVariable Long tabId, @RequestBody MediaFile file) {
        return ResponseEntity.ok(songService.addFileToTablature(tabId, file));
    }

    @DeleteMapping("/songs/{songId}/files")
    public ResponseEntity<SongModel> deleteSongFile(@PathVariable Long songId, @RequestParam String url) {
        return ResponseEntity.ok(songService.removeFileFromSong(songId, url));
    }

    @DeleteMapping("/tabs/{tabId}/files")
    public ResponseEntity<TablatureModel> deleteTablatureFile(@PathVariable Long tabId, @RequestParam String url) {
        return ResponseEntity.ok(songService.removeFileFromTablature(tabId, url));
    }
}
