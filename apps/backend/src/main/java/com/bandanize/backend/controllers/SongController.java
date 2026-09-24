package com.bandanize.backend.controllers;

import com.bandanize.backend.models.*;
import com.bandanize.backend.services.SongService;
import com.bandanize.backend.services.TabCommentService;
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
    @Autowired private com.bandanize.backend.services.ResourceAccess access;

    private static final Logger logger = LoggerFactory.getLogger(SongController.class);

    @Autowired
    private SongService songService;

    @Autowired
    private TabCommentService tabCommentService;

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
        access.band(bandId);
        return ResponseEntity.ok(songService.createSongList(bandId, getCurrentUserId(principal), songList));
    }

    @GetMapping("/bands/{bandId}/songlists")
    public ResponseEntity<List<SongListModel>> getSongLists(@PathVariable Long bandId) {
        access.band(bandId);
        return ResponseEntity.ok(songService.getSongListsByBand(bandId));
    }

    @PutMapping("/songlists/{listId}")
    public ResponseEntity<SongListModel> updateSongList(@PathVariable Long listId, @RequestBody SongListModel details) {
        access.list(listId);
        return ResponseEntity.ok(songService.updateSongList(listId, details));
    }

    @DeleteMapping("/songlists/{listId}")
    public ResponseEntity<Void> deleteSongList(@PathVariable Long listId) {
        access.list(listId);
        songService.deleteSongList(listId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/songlists/{listId}/reorder")
    public ResponseEntity<Void> reorderSongs(@PathVariable Long listId, @RequestBody List<Long> songIds) {
        access.list(listId);
        songService.reorderSongs(listId, songIds);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/bands/{bandId}/songlists/reorder")
    public ResponseEntity<Void> reorderSongLists(@PathVariable Long bandId, @RequestBody List<Long> listIds) {
        access.band(bandId);
        songService.reorderSongLists(bandId, listIds);
        return ResponseEntity.ok().build();
    }

    // --- Songs ---
    @PostMapping("/songlists/{listId}/songs")
    public ResponseEntity<SongModel> addSong(@PathVariable Long listId, @RequestBody SongModel song,
            Principal principal) {
        access.list(listId);
        return ResponseEntity.ok(songService.addSong(listId, getCurrentUserId(principal), song));
    }

    @PutMapping("/songs/{songId}")
    public ResponseEntity<SongModel> updateSong(@PathVariable Long songId,
            @RequestBody java.util.Map<String, Object> updates) {
        access.song(songId);
        return ResponseEntity.ok(songService.updateSong(songId, updates));
    }

    @DeleteMapping("/songs/{songId}")
    public ResponseEntity<Void> deleteSong(@PathVariable Long songId, @RequestParam Long listId) {
        access.list(listId);
        access.song(songId);
        songService.removeSongFromList(songId, listId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/songs/{songId}/move")
    public ResponseEntity<SongModel> moveSong(@PathVariable Long songId, @RequestParam Long sourceListId,
            @RequestParam Long targetListId) {
        access.song(songId);
        access.list(sourceListId);
        access.list(targetListId);
        return ResponseEntity.ok(songService.moveSong(songId, sourceListId, targetListId));
    }

    @PostMapping("/songs/{songId}/copy")
    public ResponseEntity<SongModel> copySong(@PathVariable Long songId, @RequestParam Long sourceListId,
            @RequestParam Long targetListId) {
        access.song(songId);
        access.list(sourceListId);
        access.list(targetListId);
        return ResponseEntity.ok(songService.copySong(songId, sourceListId, targetListId));
    }

    @PostMapping("/songs/{songId}/replicate")
    public ResponseEntity<SongModel> replicateSong(@PathVariable Long songId, @RequestParam Long targetListId) {
        access.song(songId);
        access.list(targetListId);
        return ResponseEntity.ok(songService.replicateSong(songId, targetListId));
    }

    // --- Tablatures ---
    @PostMapping("/songs/{songId}/tabs")
    public ResponseEntity<TablatureModel> addTablature(@PathVariable Long songId, @RequestBody TablatureModel tab) {
        access.song(songId);
        return ResponseEntity.ok(songService.addTablature(songId, tab));
    }

    @PutMapping("/tabs/{tabId}")
    public ResponseEntity<TablatureModel> updateTablature(@PathVariable Long tabId,
            @RequestBody TablatureModel details) {
        access.tab(tabId);
        logger.debug("Received update for tabId: {}, name={}, instrument={}", tabId, details.getName(),
                details.getInstrument());
        return ResponseEntity.ok(songService.updateTablature(tabId, details));
    }

    @DeleteMapping("/tabs/{tabId}")
    public ResponseEntity<Void> deleteTablature(@PathVariable Long tabId) {
        access.tab(tabId);
        songService.deleteTablature(tabId);
        return ResponseEntity.ok().build();
    }

    // --- Media Files ---
    @PostMapping("/songs/{songId}/files")
    public ResponseEntity<SongModel> addSongFile(@PathVariable Long songId, @RequestBody MediaFile file) {
        access.song(songId);
        return ResponseEntity.ok(songService.addFileToSong(songId, file));
    }

    @PostMapping("/tabs/{tabId}/files")
    public ResponseEntity<TablatureModel> addTablatureFile(@PathVariable Long tabId, @RequestBody MediaFile file) {
        access.tab(tabId);
        return ResponseEntity.ok(songService.addFileToTablature(tabId, file));
    }

    @DeleteMapping("/songs/{songId}/files")
    public ResponseEntity<SongModel> deleteSongFile(@PathVariable Long songId, @RequestParam String url) {
        access.song(songId);
        return ResponseEntity.ok(songService.removeFileFromSong(songId, url));
    }

    @DeleteMapping("/tabs/{tabId}/files")
    public ResponseEntity<TablatureModel> deleteTablatureFile(@PathVariable Long tabId, @RequestParam String url) {
        access.tab(tabId);
        return ResponseEntity.ok(songService.removeFileFromTablature(tabId, url));
    }

    // --- Tab Comments ---
    @GetMapping("/tabs/{tabId}/comments")
    public ResponseEntity<List<TabCommentModel>> getTabComments(@PathVariable Long tabId, Principal principal) {
        access.tab(tabId);
        return ResponseEntity.ok(tabCommentService.getComments(tabId, getCurrentUserId(principal)));
    }

    @PostMapping("/tabs/{tabId}/comments")
    public ResponseEntity<TabCommentModel> addTabComment(@PathVariable Long tabId,
            @RequestBody com.bandanize.backend.dtos.TabCommentRequest request, Principal principal) {
        access.tab(tabId);
        Long userId = getCurrentUserId(principal);
        return ResponseEntity.ok(tabCommentService.addComment(tabId, userId, request));
    }

    @DeleteMapping("/tabs/{tabId}/comments/{commentId}")
    public ResponseEntity<Void> deleteTabComment(@PathVariable Long tabId, @PathVariable Long commentId,
            Principal principal) {
        access.tab(tabId);
        tabCommentService.deleteComment(tabId, commentId, getCurrentUserId(principal));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/songlists/{listId}/duplicate")
    public ResponseEntity<SongListModel> duplicateSongList(@PathVariable Long listId,
            @RequestParam(defaultValue = "true") boolean deepCopy) {
        access.list(listId);
        SongListModel duplicateList = songService.duplicateSongList(listId, deepCopy);
        return ResponseEntity.ok(duplicateList);
    }
}
