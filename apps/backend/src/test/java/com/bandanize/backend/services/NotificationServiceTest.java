package com.bandanize.backend.services;

import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private BandRepository bandRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Captor
    private ArgumentCaptor<Notification> notificationCaptor;

    private BandModel band;
    private UserModel actor;
    private UserModel recipient1;
    private UserModel recipient2;

    @BeforeEach
    void setUp() {
        actor = new UserModel();
        actor.setId(1L);
        actor.setUsername("actor");
        actor.setName("Actor User");

        recipient1 = new UserModel();
        recipient1.setId(2L);
        recipient1.setUsername("user2");
        recipient1.setName("User Two");

        recipient2 = new UserModel();
        recipient2.setId(3L);
        recipient2.setUsername("user3");
        recipient2.setName("User Three");

        band = new BandModel();
        band.setId(10L);
        band.setName("Test Band");
        band.setUsers(new ArrayList<>(List.of(actor, recipient1, recipient2)));
    }

    // ── createNotification (via createSongNotification) ─────────────

    @Test
    void createNotification_SkipsActor() {
        SongModel song = new SongModel();
        song.setName("Test Song");

        notificationService.createSongNotification(band, actor, song);

        // Should save 2 notifications (for recipient1 and recipient2), NOT for actor
        verify(notificationRepository, times(2)).save(notificationCaptor.capture());

        List<Notification> saved = notificationCaptor.getAllValues();
        assertTrue(saved.stream().noneMatch(n -> n.getRecipient().getId().equals(actor.getId())));
    }

    @Test
    void createNotification_NotifiesAllOtherMembers() {
        SongListModel list = new SongListModel();
        list.setName("Setlist 1");

        notificationService.createListNotification(band, actor, list);

        verify(notificationRepository, times(2)).save(notificationCaptor.capture());

        List<Notification> saved = notificationCaptor.getAllValues();
        assertEquals(2, saved.size());
        assertTrue(saved.stream().anyMatch(n -> n.getRecipient().getId().equals(2L)));
        assertTrue(saved.stream().anyMatch(n -> n.getRecipient().getId().equals(3L)));

        // All notifications should reference the band and actor
        saved.forEach(n -> {
            assertEquals(band, n.getBand());
            assertEquals(actor, n.getActor());
            assertEquals(Notification.NotificationType.LIST_CREATED, n.getType());
        });
    }

    @Test
    void createNotification_SingleMemberBand_NoNotifications() {
        // Band with only the actor — nobody to notify
        band.setUsers(new ArrayList<>(List.of(actor)));

        SongModel song = new SongModel();
        song.setName("Solo Song");

        notificationService.createSongNotification(band, actor, song);

        verify(notificationRepository, never()).save(any());
    }

    // ── createChatMentionNotification ───────────────────────────────

    @Test
    void createChatMentionNotification_OnlyNotifiesMentionedUser() {
        notificationService.createChatMentionNotification(band, actor, recipient1);

        verify(notificationRepository, times(1)).save(notificationCaptor.capture());

        Notification saved = notificationCaptor.getValue();
        assertEquals(recipient1, saved.getRecipient());
        assertEquals(actor, saved.getActor());
        assertEquals(Notification.NotificationType.CHAT_MENTION, saved.getType());
    }

    // ── createEventNotification ─────────────────────────────────────

    @Test
    void createEventNotification_NewEvent_UsesCorrectType() {
        EventModel event = new EventModel();
        event.setName("Gig");

        notificationService.createEventNotification(band, actor, event, false);

        verify(notificationRepository, times(2)).save(notificationCaptor.capture());
        notificationCaptor.getAllValues()
                .forEach(n -> assertEquals(Notification.NotificationType.EVENT_CREATED, n.getType()));
    }

    @Test
    void createEventNotification_ModifiedEvent_UsesCorrectType() {
        EventModel event = new EventModel();
        event.setName("Gig Updated");

        notificationService.createEventNotification(band, actor, event, true);

        verify(notificationRepository, times(2)).save(notificationCaptor.capture());
        notificationCaptor.getAllValues()
                .forEach(n -> assertEquals(Notification.NotificationType.EVENT_MODIFIED, n.getType()));
    }

    // ── getUnreadCount / markAllAsRead ───────────────────────────────

    @Test
    void getUnreadCount_DelegatesToRepository() {
        when(notificationRepository.countByBandIdAndRecipientIdAndIsReadFalse(10L, 2L)).thenReturn(5L);

        long count = notificationService.getUnreadCount(10L, 2L);

        assertEquals(5L, count);
    }

    @Test
    void markAllAsRead_DelegatesToRepository() {
        notificationService.markAllAsRead(10L, 2L);

        verify(notificationRepository).markAllAsRead(10L, 2L);
    }
}
