package com.bandanize.backend.services;

import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SongServiceTest {

    @Mock
    private SongListRepository songListRepository;

    @Mock
    private SongRepository songRepository;

    @Mock
    private TablatureRepository tablatureRepository;

    @Mock
    private BandRepository bandRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private StorageService storageService;

    @InjectMocks
    private SongService songService;

    private BandModel band;
    private UserModel user;
    private SongListModel songList;
    private SongModel song;
    private TablatureModel tablature;

    @BeforeEach
    void setUp() {
        user = new UserModel();
        user.setId(1L);
        user.setUsername("testuser");
        user.setName("Test User");

        band = new BandModel();
        band.setId(10L);
        band.setName("Test Band");
        band.setSongLists(new ArrayList<>());

        songList = new SongListModel();
        songList.setId(100L);
        songList.setName("Setlist 1");
        songList.setBand(band);
        songList.setSongs(new ArrayList<>());

        song = new SongModel();
        song.setId(200L);
        song.setName("Test Song");
        song.setBpm(120);
        song.setSongKey("Am");
        song.setOriginalBand("Original Band");
        song.setBand(band);
        song.setTablatures(new ArrayList<>());
        song.setFiles(new ArrayList<>());

        tablature = new TablatureModel();
        tablature.setId(300L);
        tablature.setName("Guitar Tab");
        tablature.setInstrument("Guitar");
        tablature.setInstrumentIcon("guitar-icon");
        tablature.setTuning("Standard");
        tablature.setContent("e|---0---|");
        tablature.setSong(song);
        tablature.setFiles(new ArrayList<>());
    }

    // ── SongList CRUD ───────────────────────────────────────────────

    @Test
    void createSongList_Success() {
        SongListModel details = new SongListModel();
        details.setName("New Setlist");

        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(songListRepository.save(any(SongListModel.class))).thenAnswer(inv -> {
            SongListModel sl = inv.getArgument(0);
            sl.setId(101L);
            return sl;
        });

        SongListModel result = songService.createSongList(10L, 1L, details);

        assertEquals("New Setlist", result.getName());
        assertEquals(band, result.getBand());
        assertEquals(0, result.getOrderIndex()); // default to band's songLists size (0)
        verify(notificationService).createListNotification(eq(band), eq(user), any());
    }

    @Test
    void createSongList_BandNotFound_ThrowsException() {
        when(bandRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> songService.createSongList(99L, 1L, new SongListModel()));
    }

    @Test
    void createSongList_SetsDefaultOrderIndex() {
        // Band already has 2 song lists
        band.getSongLists().add(new SongListModel());
        band.getSongLists().add(new SongListModel());

        SongListModel details = new SongListModel();
        details.setName("Third Setlist");

        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(songListRepository.save(any(SongListModel.class))).thenAnswer(inv -> inv.getArgument(0));

        SongListModel result = songService.createSongList(10L, 1L, details);

        assertEquals(2, result.getOrderIndex()); // appended at end
    }

    @Test
    void getSongListsByBand_DelegatesToRepo() {
        when(songListRepository.findByBandId(10L)).thenReturn(List.of(songList));

        List<SongListModel> result = songService.getSongListsByBand(10L);

        assertEquals(1, result.size());
        assertEquals("Setlist 1", result.get(0).getName());
    }

    @Test
    void updateSongList_Success() {
        SongListModel details = new SongListModel();
        details.setName("Updated Setlist");

        when(songListRepository.findById(100L)).thenReturn(Optional.of(songList));
        when(songListRepository.save(any(SongListModel.class))).thenAnswer(inv -> inv.getArgument(0));

        SongListModel result = songService.updateSongList(100L, details);

        assertEquals("Updated Setlist", result.getName());
    }

    @Test
    void updateSongList_NotFound_ThrowsException() {
        when(songListRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> songService.updateSongList(99L, new SongListModel()));
    }

    @Test
    void deleteSongList_CleansUpFilesAndDeletes() {
        MediaFile file = new MediaFile("audio.mp3", "audio/mpeg", "/uploads/songs/audio.mp3");
        song.getFiles().add(file);
        songList.getSongs().add(song);

        when(songListRepository.findById(100L)).thenReturn(Optional.of(songList));

        songService.deleteSongList(100L);

        verify(storageService).deleteFile("audio.mp3", "songs");
        verify(songListRepository).delete(songList);
    }

    // ── Song CRUD ───────────────────────────────────────────────────

    @Test
    void addSong_Success() {
        SongModel details = new SongModel();
        details.setName("New Song");

        when(songListRepository.findById(100L)).thenReturn(Optional.of(songList));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(songRepository.save(any(SongModel.class))).thenAnswer(inv -> {
            SongModel s = inv.getArgument(0);
            s.setId(201L);
            return s;
        });

        SongModel result = songService.addSong(100L, 1L, details);

        assertEquals("New Song", result.getName());
        assertEquals(band, result.getBand());
        verify(notificationService).createSongNotification(eq(band), eq(user), any());
    }

    @Test
    void addSong_ListNotFound_ThrowsException() {
        when(songListRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> songService.addSong(99L, 1L, new SongModel()));
    }

    @Test
    void updateSong_AllFields() {
        Map<String, Object> updates = new HashMap<>();
        updates.put("name", "Updated Song");
        updates.put("bpm", 140);
        updates.put("songKey", "Em");
        updates.put("originalBand", "New Band");

        when(songRepository.findById(200L)).thenReturn(Optional.of(song));
        when(songRepository.saveAndFlush(any(SongModel.class))).thenAnswer(inv -> inv.getArgument(0));

        SongModel result = songService.updateSong(200L, updates);

        assertEquals("Updated Song", result.getName());
        assertEquals(140, result.getBpm());
        assertEquals("Em", result.getSongKey());
        assertEquals("New Band", result.getOriginalBand());
    }

    @Test
    void updateSong_BpmAsNull_ClearsBpm() {
        Map<String, Object> updates = new HashMap<>();
        updates.put("bpm", null);

        when(songRepository.findById(200L)).thenReturn(Optional.of(song));
        when(songRepository.saveAndFlush(any(SongModel.class))).thenAnswer(inv -> inv.getArgument(0));

        SongModel result = songService.updateSong(200L, updates);

        assertNull(result.getBpm());
    }

    @Test
    void updateSong_BpmAsString_ParsesCorrectly() {
        Map<String, Object> updates = new HashMap<>();
        updates.put("bpm", "160");

        when(songRepository.findById(200L)).thenReturn(Optional.of(song));
        when(songRepository.saveAndFlush(any(SongModel.class))).thenAnswer(inv -> inv.getArgument(0));

        SongModel result = songService.updateSong(200L, updates);

        assertEquals(160, result.getBpm());
    }

    @Test
    void updateSong_NotFound_ThrowsException() {
        when(songRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> songService.updateSong(99L, Map.of("name", "x")));
    }

    @Test
    void deleteSong_CleansUpFilesAndDeletes() {
        MediaFile sf = new MediaFile("song.mp3", "audio/mpeg", "/uploads/songs/song.mp3");
        song.getFiles().add(sf);

        MediaFile tf = new MediaFile("tab.pdf", "application/pdf", "/uploads/tabs/tab.pdf");
        tablature.getFiles().add(tf);
        song.getTablatures().add(tablature);

        when(songRepository.findById(200L)).thenReturn(Optional.of(song));

        songService.deleteSong(200L);

        verify(storageService).deleteFile("song.mp3", "songs");
        verify(storageService).deleteFile("tab.pdf", "tabs");
        verify(songRepository).delete(song);
    }

    // ── Reorder ─────────────────────────────────────────────────────

    @Test
    void reorderSongs_UpdatesOrderIndexes() {
        SongModel song1 = new SongModel();
        song1.setId(1L);
        SongModel song2 = new SongModel();
        song2.setId(2L);
        SongModel song3 = new SongModel();
        song3.setId(3L);

        songList.setSongs(new ArrayList<>(List.of(song1, song2, song3)));

        when(songListRepository.findById(100L)).thenReturn(Optional.of(songList));

        // Reverse the order
        songService.reorderSongs(100L, List.of(3L, 2L, 1L));

        assertEquals(3L, songList.getSongs().get(0).getId());
        assertEquals(2L, songList.getSongs().get(1).getId());
        assertEquals(1L, songList.getSongs().get(2).getId());
        verify(songListRepository).save(songList);
    }

    @Test
    void reorderSongLists_UpdatesOrderIndexes() {
        SongListModel list1 = new SongListModel();
        list1.setId(1L);
        list1.setOrderIndex(0);
        SongListModel list2 = new SongListModel();
        list2.setId(2L);
        list2.setOrderIndex(1);

        band.setSongLists(new ArrayList<>(List.of(list1, list2)));

        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));

        songService.reorderSongLists(10L, List.of(2L, 1L));

        assertEquals(1, list1.getOrderIndex());
        assertEquals(0, list2.getOrderIndex());
        verify(bandRepository).save(band);
    }

    // ── Tablature ───────────────────────────────────────────────────

    @Test
    void addTablature_Success() {
        TablatureModel details = new TablatureModel();
        details.setName("Bass Tab");
        details.setInstrument("Bass");

        when(songRepository.findById(200L)).thenReturn(Optional.of(song));
        when(tablatureRepository.save(any(TablatureModel.class))).thenAnswer(inv -> {
            TablatureModel t = inv.getArgument(0);
            t.setId(301L);
            return t;
        });

        TablatureModel result = songService.addTablature(200L, details);

        assertEquals("Bass Tab", result.getName());
        assertEquals(song, result.getSong());
    }

    @Test
    void updateTablature_PartialUpdate_KeepsExistingFields() {
        TablatureModel details = new TablatureModel();
        details.setName("Renamed Tab");
        // instrument, tuning, content stay null → should keep original

        when(tablatureRepository.findById(300L)).thenReturn(Optional.of(tablature));
        when(tablatureRepository.saveAndFlush(any(TablatureModel.class))).thenAnswer(inv -> inv.getArgument(0));

        TablatureModel result = songService.updateTablature(300L, details);

        assertEquals("Renamed Tab", result.getName());
        assertEquals("Guitar", result.getInstrument()); // unchanged
        assertEquals("Standard", result.getTuning()); // unchanged
        assertEquals("e|---0---|", result.getContent()); // unchanged
    }

    @Test
    void deleteTablature_CleansUpFiles() {
        MediaFile file = new MediaFile("tab.pdf", "application/pdf", "/uploads/tabs/tab.pdf");
        tablature.getFiles().add(file);

        when(tablatureRepository.findById(300L)).thenReturn(Optional.of(tablature));

        songService.deleteTablature(300L);

        verify(storageService).deleteFile("tab.pdf", "tabs");
        verify(tablatureRepository).delete(tablature);
    }

    // ── Media Files ─────────────────────────────────────────────────

    @Test
    void addFileToSong_Success() {
        MediaFile file = new MediaFile("photo.jpg", "image/jpeg", "/uploads/images/photo.jpg");

        when(songRepository.findById(200L)).thenReturn(Optional.of(song));
        when(songRepository.save(any(SongModel.class))).thenAnswer(inv -> inv.getArgument(0));

        SongModel result = songService.addFileToSong(200L, file);

        assertEquals(1, result.getFiles().size());
        assertEquals("photo.jpg", result.getFiles().get(0).getName());
    }

    @Test
    void removeFileFromSong_Success() {
        MediaFile file = new MediaFile("audio.mp3", "audio/mpeg", "/uploads/songs/audio.mp3");
        song.getFiles().add(file);

        when(songRepository.findById(200L)).thenReturn(Optional.of(song));
        when(songRepository.save(any(SongModel.class))).thenAnswer(inv -> inv.getArgument(0));

        SongModel result = songService.removeFileFromSong(200L, "/uploads/songs/audio.mp3");

        assertTrue(result.getFiles().isEmpty());
        verify(storageService).deleteFile("audio.mp3", "songs");
    }

    @Test
    void removeFileFromSong_FileNotFound_ThrowsException() {
        when(songRepository.findById(200L)).thenReturn(Optional.of(song));

        assertThrows(ResourceNotFoundException.class,
                () -> songService.removeFileFromSong(200L, "/uploads/songs/nonexistent.mp3"));
    }
}
