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

        song.setBand(list.getBand());

        SongModel savedSong = songRepository.save(song);

        list.getSongs().add(savedSong);
        songListRepository.save(list);

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

    @org.springframework.transaction.annotation.Transactional
    public void removeSongFromList(Long songId, Long listId) {
        SongModel song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found"));
        SongListModel targetList = songListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("SongList not found"));

        targetList.getSongs().remove(song);
        songListRepository.save(targetList);

        boolean isOrphaned = true;
        for (SongListModel sl : song.getBand().getSongLists()) {
            if (sl.getSongs().contains(song)) {
                isOrphaned = false;
                break;
            }
        }

        if (isOrphaned) {
            cleanupSongFiles(song);
            songRepository.delete(song);
        }
    }

    public SongModel moveSong(Long songId, Long sourceListId, Long targetListId) {
        SongModel song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found"));
        SongListModel sourceList = songListRepository.findById(sourceListId)
                .orElseThrow(() -> new ResourceNotFoundException("Source SongList not found"));
        SongListModel targetList = songListRepository.findById(targetListId)
                .orElseThrow(() -> new ResourceNotFoundException("Target SongList not found"));

        sourceList.getSongs().remove(song);
        targetList.getSongs().add(song);

        songListRepository.save(sourceList);
        songListRepository.save(targetList);

        return song;
    }

    public SongModel copySong(Long songId, Long sourceListId, Long targetListId) {
        SongModel song = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found"));
        SongListModel targetList = songListRepository.findById(targetListId)
                .orElseThrow(() -> new ResourceNotFoundException("Target SongList not found"));

        if (!targetList.getSongs().contains(song)) {
            targetList.getSongs().add(song);
            songListRepository.save(targetList);
        }

        return song;
    }

    public SongModel replicateSong(Long songId, Long targetListId) {
        return replicateSongInternal(songId, targetListId, true);
    }

    private SongModel replicateSongInternal(Long songId, Long targetListId, boolean appendCopySuffix) {
        SongModel originalSong = songRepository.findById(songId)
                .orElseThrow(() -> new ResourceNotFoundException("Song not found"));
        SongListModel targetList = songListRepository.findById(targetListId)
                .orElseThrow(() -> new ResourceNotFoundException("Target SongList not found"));

        // Create a deep copy of the song
        SongModel clonedSong = new SongModel();
        clonedSong.setName(originalSong.getName() + (appendCopySuffix ? " (Copy)" : ""));
        clonedSong.setBpm(originalSong.getBpm());
        clonedSong.setSongKey(originalSong.getSongKey());
        clonedSong.setOriginalBand(originalSong.getOriginalBand());
        clonedSong.setBand(originalSong.getBand());

        // Clone media files (We'll duplicate the records, but they'll point to the same
        // physical file for now.
        // It's safe since deleting a file from storage might break the others.
        // Ideally, we'd copy the physical file too, but we will just refer to it)
        // Actually, since deleteFileFromStorage deletes physical file, if two DB
        // records point to it,
        // deleting one breaks the other.
        // For physical files, we should probably duplicate them to be truly independent
        // or use reference counting.
        // Given the requirement 'Copiado y Duplicado de canciones', we will just copy
        // the DB record for now,
        // but note that deleting the copy will delete the file for the original.
        // To fix this properly, we need to physically copy the file in storage.

        // As a simple approach for this issue, we will just copy the metadata.
        // A better approach would be to copy the file in storageService as well.
        // I will copy the files in DB.

        clonedSong.setFiles(new java.util.ArrayList<>());
        for (MediaFile file : originalSong.getFiles()) {
            try {
                String[] parts = file.getUrl().split("/");
                if (parts.length >= 2) {
                    String filename = parts[parts.length - 1];
                    String folder = parts[parts.length - 2];

                    String newFilename = storageService.copyFile(filename, folder);
                    if (newFilename != null) {
                        MediaFile newFile = new MediaFile(
                                file.getName() + " (Copy)",
                                file.getType(),
                                "/api/uploads/" + folder + "/" + newFilename);
                        clonedSong.getFiles().add(newFile);
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to copy file for song replication: " + file.getUrl(), e);
            }
        }

        // Save the cloned song first to get an ID
        SongModel savedClone = songRepository.save(clonedSong);

        // Clone tablatures
        if (originalSong.getTablatures() != null) {
            java.util.List<TablatureModel> clonedTabs = new java.util.ArrayList<>();
            for (TablatureModel originalTab : originalSong.getTablatures()) {
                TablatureModel clonedTab = new TablatureModel();
                clonedTab.setName(originalTab.getName());
                clonedTab.setInstrument(originalTab.getInstrument());
                clonedTab.setInstrumentIcon(originalTab.getInstrumentIcon());
                clonedTab.setTuning(originalTab.getTuning());
                clonedTab.setContent(originalTab.getContent());
                clonedTab.setSong(savedClone);

                clonedTab.setFiles(new java.util.ArrayList<>());
                for (MediaFile file : originalTab.getFiles()) {
                    try {
                        String[] parts = file.getUrl().split("/");
                        if (parts.length >= 2) {
                            String filename = parts[parts.length - 1];
                            String folder = parts[parts.length - 2];

                            String newFilename = storageService.copyFile(filename, folder);
                            if (newFilename != null) {
                                MediaFile newFile = new MediaFile(
                                        file.getName() + " (Copy)",
                                        file.getType(),
                                        "/api/uploads/" + folder + "/" + newFilename);
                                clonedTab.getFiles().add(newFile);
                            }
                        }
                    } catch (Exception e) {
                        logger.error("Failed to copy file for tab replication: " + file.getUrl(), e);
                    }
                }

                clonedTabs.add(tablatureRepository.save(clonedTab));
            }
            if (savedClone.getTablatures() == null) {
                savedClone.setTablatures(new java.util.ArrayList<>());
            }
            savedClone.getTablatures().addAll(clonedTabs);
        }

        targetList.getSongs().add(savedClone);
        songListRepository.save(targetList);

        return savedClone;
    }

    public void reorderSongs(Long listId, List<Long> songIds) {
        SongListModel list = songListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("SongList not found"));

        List<SongModel> currentSongs = list.getSongs();
        java.util.Map<Long, SongModel> songMap = currentSongs.stream()
                .collect(java.util.stream.Collectors.toMap(SongModel::getId, s -> s));

        java.util.List<SongModel> reordered = new java.util.ArrayList<>();
        for (Long id : songIds) {
            if (songMap.containsKey(id)) {
                reordered.add(songMap.get(id));
            }
        }

        list.getSongs().clear();
        list.getSongs().addAll(reordered);
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

    @org.springframework.transaction.annotation.Transactional
    public SongListModel duplicateSongList(Long listId, boolean deepCopy) {
        SongListModel originalList = songListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("SongList not found"));

        SongListModel newList = new SongListModel();
        newList.setName(originalList.getName() + " (Copy)");
        newList.setBand(originalList.getBand());

        // Place the duplicate after the original or at the end
        Integer maxOrderIndex = songListRepository.findMaxOrderIndexByBandId(originalList.getBand().getId());
        newList.setOrderIndex(maxOrderIndex != null ? maxOrderIndex + 1 : 0);

        if (deepCopy) {
            // Save the new list to get an ID
            SongListModel savedList = songListRepository.save(newList);

            // Deep copy all songs from the original list without appending "(Copy)" to the
            // song names
            for (SongModel song : originalList.getSongs()) {
                replicateSongInternal(song.getId(), savedList.getId(), false);
            }

            return songListRepository.findById(savedList.getId()).get();
        } else {
            // Just copy the references to the same songs
            newList.getSongs().addAll(originalList.getSongs());
            return songListRepository.save(newList);
        }
    }
}
