package com.bandanize.backend.services;

import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SongService {

    private static final Logger logger = LoggerFactory.getLogger(SongService.class);

    @Autowired
    private SongListRepository songListRepository;
    @Autowired
    private SongRepository songRepository;
    @Autowired
    private TablatureRepository tablatureRepository;
    @Autowired
    private BandRepository bandRepository;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private UserRepository userRepository;

    // --- SongList ---
    public SongListModel createSongList(Long bandId, Long userId, SongListModel songList) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found"));
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        songList.setBand(band);

        // Set default order index to current size (append to end)
        if (songList.getOrderIndex() == null) {
            songList.setOrderIndex(band.getSongLists().size());
        }

        SongListModel savedList = songListRepository.save(songList);

        notificationService.createListNotification(band, user, savedList);
        return savedList;
    }

    public List<SongListModel> getSongListsByBand(Long bandId) {
        return songListRepository.findByBandId(bandId);
    }

    public SongListModel updateSongList(Long listId, SongListModel details) {
        SongListModel list = songListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("SongList not found"));
        if (details.getName() != null) {
            list.setName(details.getName());
        }
        return songListRepository.save(list);
    }

    public void deleteSongList(Long listId) {
        SongListModel list = songListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("SongList not found"));

        // Delete all songs (which triggers file cleanup)
        for (SongModel song : list.getSongs()) {
            // Recursively clean up song files
            cleanupSongFiles(song);
        }

        songListRepository.delete(list);
    }

    // ...

    // --- Song ---
    public SongModel addSong(Long listId, Long userId, SongModel song) {
        SongListModel list = songListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("SongList not found"));
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        song.setSongList(list);

        // Set default order index to current size (append to end)
        if (song.getOrderIndex() == null) {
            song.setOrderIndex(list.getSongs().size());
        }

        SongModel savedSong = songRepository.save(song);
        notificationService.createSongNotification(list.getBand(), user, savedSong);
        return savedSong;
    }

    @org.springframework.transaction.annotation.Transactional
    public SongModel updateSong(Long songId, java.util.Map<String, Object> updates) {
        SongModel song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found"));

        if (updates.containsKey("name")) {
            song.setName((String) updates.get("name"));
        }
        if (updates.containsKey("bpm")) {
            Object bpmVal = updates.get("bpm");
            if (bpmVal == null) {
                song.setBpm(null);
            } else if (bpmVal instanceof Number) {
                song.setBpm(((Number) bpmVal).intValue());
            } else if (bpmVal instanceof String && !((String) bpmVal).isEmpty()) {
                try {
                    song.setBpm(Integer.parseInt((String) bpmVal));
                } catch (NumberFormatException e) {
                    // ignore or set null
                }
            } else {
                song.setBpm(null);
            }
        }
        if (updates.containsKey("songKey")) {
            song.setSongKey((String) updates.get("songKey"));
        }
        if (updates.containsKey("originalBand")) {
            song.setOriginalBand((String) updates.get("originalBand"));
        }

        return songRepository.saveAndFlush(song);
    }

    public void deleteSong(Long songId) {
        SongModel song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found"));

        cleanupSongFiles(song);

        songRepository.delete(song);
    }

    public void reorderSongs(Long listId, List<Long> songIds) {
        SongListModel list = songListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("SongList not found"));

        // Setup a map for faster lookup or just iterate if list is small.
        // Lists are usually small (< 100 songs), so iterating is fine but let's be
        // safe.
        // Actually we need to update the entities.

        List<SongModel> songs = list.getSongs();
        for (int i = 0; i < songIds.size(); i++) {
            Long songId = songIds.get(i);
            // find the song in the list
            for (SongModel s : songs) {
                if (s.getId().equals(songId)) {
                    s.setOrderIndex(i);
                    break;
                }
            }
        }

        songListRepository.save(list);
    }

    public void reorderSongLists(Long bandId, List<Long> listIds) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found"));

        List<SongListModel> lists = band.getSongLists();
        for (int i = 0; i < listIds.size(); i++) {
            Long listId = listIds.get(i);
            for (SongListModel list : lists) {
                if (list.getId().equals(listId)) {
                    list.setOrderIndex(i);
                    break;
                }
            }
        }
        bandRepository.save(band);
    }

    private void cleanupSongFiles(SongModel song) {
        // Delete song files
        for (MediaFile file : song.getFiles()) {
            deleteFileFromStorage(file.getUrl());
        }

        // Delete tablature files
        for (TablatureModel tab : song.getTablatures()) {
            for (MediaFile file : tab.getFiles()) {
                deleteFileFromStorage(file.getUrl());
            }
        }
    }

    // --- Tablature ---
    public TablatureModel addTablature(Long songId, TablatureModel tab) {
        SongModel song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found"));
        tab.setSong(song);
        return tablatureRepository.save(tab);
    }

    public TablatureModel updateTablature(Long tabId, TablatureModel details) {
        TablatureModel tab = tablatureRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tablature not found"));
        if (details.getName() != null)
            tab.setName(details.getName());
        if (details.getInstrument() != null)
            tab.setInstrument(details.getInstrument());
        if (details.getInstrumentIcon() != null)
            tab.setInstrumentIcon(details.getInstrumentIcon());
        if (details.getTuning() != null)
            tab.setTuning(details.getTuning());
        if (details.getContent() != null)
            tab.setContent(details.getContent());
        if (details.getFiles() != null) {
            tab.setFiles(details.getFiles());
        }
        logger.debug("Saving tab update to DB for tabId: {}", tabId);
        return tablatureRepository.saveAndFlush(tab);
    }

    public void deleteTablature(Long tabId) {
        TablatureModel tab = tablatureRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tablature not found"));

        // Clean up files
        for (MediaFile file : tab.getFiles()) {
            deleteFileFromStorage(file.getUrl());
        }

        tablatureRepository.delete(tab);
    }

    public SongModel addFileToSong(Long songId, MediaFile file) {
        SongModel song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found"));
        song.getFiles().add(file);
        return songRepository.save(song);
    }

    public TablatureModel addFileToTablature(Long tabId, MediaFile file) {
        TablatureModel tab = tablatureRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tablature not found"));
        tab.getFiles().add(file);
        return tablatureRepository.save(tab);
    }

    @Autowired
    private StorageService storageService;

    public SongModel removeFileFromSong(Long songId, String fileUrl) {
        SongModel song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found"));

        MediaFile fileToRemove = song.getFiles().stream()
                .filter(f -> f.getUrl().equals(fileUrl))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        // Delete from storage
        deleteFileFromStorage(fileToRemove.getUrl());

        // Remove from DB
        song.getFiles().remove(fileToRemove);
        return songRepository.save(song);
    }

    public TablatureModel removeFileFromTablature(Long tabId, String fileUrl) {
        TablatureModel tab = tablatureRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tablature not found"));

        MediaFile fileToRemove = tab.getFiles().stream()
                .filter(f -> f.getUrl().equals(fileUrl))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        // Delete from storage
        deleteFileFromStorage(fileToRemove.getUrl());

        // Remove from DB
        tab.getFiles().remove(fileToRemove);
        return tablatureRepository.save(tab);
    }

    private void deleteFileFromStorage(String fileUrl) {
        // Expected URL format: /uploads/{folder}/{filename}
        try {
            String[] parts = fileUrl.split("/");
            if (parts.length >= 2) {
                String filename = parts[parts.length - 1];
                String folder = parts[parts.length - 2];
                storageService.deleteFile(filename, folder);
            }
        } catch (Exception e) {
            // Log warning but don't fail the operation? Or fail?
            // Failing is safer to keep consistency, but if file is already gone, maybe not.
            // Let's let it throw for now.
            throw new RuntimeException("Failed to delete file from storage: " + e.getMessage());
        }
    }
}
