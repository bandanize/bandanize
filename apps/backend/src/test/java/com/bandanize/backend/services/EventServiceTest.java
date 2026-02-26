package com.bandanize.backend.services;

import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.models.EventModel;
import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.EventRepository;
import com.bandanize.backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private BandRepository bandRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private EventService eventService;

    private BandModel band;
    private UserModel user;
    private EventModel event;

    @BeforeEach
    void setUp() {
        user = new UserModel();
        user.setId(1L);
        user.setUsername("creator");
        user.setName("Creator");
        user.setBands(new ArrayList<>());

        band = new BandModel();
        band.setId(10L);
        band.setName("Test Band");
        band.setUsers(new ArrayList<>(List.of(user)));

        event = new EventModel();
        event.setId(100L);
        event.setName("Rehearsal");
        event.setDescription("Weekly jam");
        event.setDate(LocalDateTime.now().plusDays(7));
        event.setType("rehearsal");
        event.setLocation("Studio A");
        event.setBand(band);
        event.setCreator(user);
    }

    // ── getEventsByBand ─────────────────────────────────────────────

    @Test
    void getEventsByBand_ReturnsSortedEvents() {
        when(eventRepository.findByBandIdOrderByDateAsc(10L)).thenReturn(List.of(event));

        List<EventModel> result = eventService.getEventsByBand(10L);

        assertEquals(1, result.size());
        assertEquals("Rehearsal", result.get(0).getName());
    }

    // ── createEvent ─────────────────────────────────────────────────

    @Test
    void createEvent_Success() {
        EventModel details = new EventModel();
        details.setName("Gig");
        details.setDate(LocalDateTime.now().plusDays(14));

        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(eventRepository.save(any(EventModel.class))).thenAnswer(inv -> {
            EventModel e = inv.getArgument(0);
            e.setId(101L);
            return e;
        });

        EventModel result = eventService.createEvent(10L, 1L, details);

        assertEquals("Gig", result.getName());
        assertEquals(band, result.getBand());
        assertEquals(user, result.getCreator());
        verify(notificationService).createEventNotification(eq(band), eq(user), any(), eq(false));
    }

    @Test
    void createEvent_BandNotFound_ThrowsException() {
        when(bandRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> eventService.createEvent(99L, 1L, new EventModel()));
    }

    @Test
    void createEvent_UserNotFound_ThrowsException() {
        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> eventService.createEvent(10L, 99L, new EventModel()));
    }

    // ── updateEvent ─────────────────────────────────────────────────

    @Test
    void updateEvent_Success_UpdatesAllFields() {
        EventModel details = new EventModel();
        details.setName("Updated Rehearsal");
        details.setDescription("New description");
        details.setLocation("Studio B");

        when(eventRepository.findById(100L)).thenReturn(Optional.of(event));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(eventRepository.save(any(EventModel.class))).thenAnswer(inv -> inv.getArgument(0));

        EventModel result = eventService.updateEvent(100L, 1L, details);

        assertEquals("Updated Rehearsal", result.getName());
        assertEquals("New description", result.getDescription());
        assertEquals("Studio B", result.getLocation());
        verify(notificationService).createEventNotification(eq(band), eq(user), any(), eq(true));
    }

    @Test
    void updateEvent_PartialUpdate_KeepsExistingFields() {
        EventModel details = new EventModel();
        details.setName("New Name");
        // description, location, etc. stay null

        when(eventRepository.findById(100L)).thenReturn(Optional.of(event));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(eventRepository.save(any(EventModel.class))).thenAnswer(inv -> inv.getArgument(0));

        EventModel result = eventService.updateEvent(100L, 1L, details);

        assertEquals("New Name", result.getName());
        assertEquals("Weekly jam", result.getDescription()); // unchanged
        assertEquals("Studio A", result.getLocation()); // unchanged
    }

    @Test
    void updateEvent_NotFound_ThrowsException() {
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> eventService.updateEvent(99L, 1L, new EventModel()));
    }

    // ── deleteEvent ─────────────────────────────────────────────────

    @Test
    void deleteEvent_Success() {
        when(eventRepository.findById(100L)).thenReturn(Optional.of(event));

        eventService.deleteEvent(100L);

        verify(eventRepository).delete(event);
    }

    @Test
    void deleteEvent_NotFound_ThrowsException() {
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> eventService.deleteEvent(99L));
    }
}
