package com.bandanize.backend.services;

import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.ChatMessageRepository;
import com.bandanize.backend.repositories.UserRepository;
import com.bandanize.backend.repositories.ChatReadStatusRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
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
class ChatServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private BandRepository bandRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ChatReadStatusRepository chatReadStatusRepository;

    @InjectMocks
    private ChatService chatService;

    @Captor
    private ArgumentCaptor<ChatMessageModel> messageCaptor;

    private BandModel band;
    private UserModel sender;
    private UserModel member;

    @BeforeEach
    void setUp() {
        sender = new UserModel();
        sender.setId(1L);
        sender.setUsername("sender");
        sender.setName("Sender User");

        member = new UserModel();
        member.setId(2L);
        member.setUsername("member");
        member.setName("Member User");

        band = new BandModel();
        band.setId(10L);
        band.setName("Test Band");
        band.setUsers(new ArrayList<>(List.of(sender, member)));
    }

    // ── getChatHistory ──────────────────────────────────────────────

    @Test
    void getChatHistory_DelegatesToRepo() {
        ChatMessageModel msg = new ChatMessageModel();
        msg.setMessage("Hello");
        when(chatMessageRepository.findByBandIdOrderByTimestampAsc(10L)).thenReturn(List.of(msg));

        List<ChatMessageModel> result = chatService.getChatHistory(10L);

        assertEquals(1, result.size());
        assertEquals("Hello", result.get(0).getMessage());
    }

    // ── sendMessage ─────────────────────────────────────────────────

    @Test
    void sendMessage_Success() {
        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(chatMessageRepository.save(any(ChatMessageModel.class))).thenAnswer(inv -> {
            ChatMessageModel m = inv.getArgument(0);
            m.setId(100L);
            return m;
        });

        ChatMessageModel result = chatService.sendMessage(10L, 1L, "Hello everyone!");

        assertEquals("Hello everyone!", result.getMessage());
        assertEquals(sender, result.getSender());
        assertEquals(band, result.getBand());
        assertNotNull(result.getTimestamp());
    }

    @Test
    void sendMessage_BandNotFound_ThrowsException() {
        when(bandRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> chatService.sendMessage(99L, 1L, "test"));
    }

    @Test
    void sendMessage_WithMention_NotifiesMentionedUser() {
        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(chatMessageRepository.save(any(ChatMessageModel.class))).thenAnswer(inv -> inv.getArgument(0));

        chatService.sendMessage(10L, 1L, "Hey @Member User check this out!");

        verify(notificationService).createChatMentionNotification(band, sender, member);
    }

    @Test
    void sendMessage_WithoutMention_NoMentionNotification() {
        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(chatMessageRepository.save(any(ChatMessageModel.class))).thenAnswer(inv -> inv.getArgument(0));

        chatService.sendMessage(10L, 1L, "Just a normal message");

        verify(notificationService, never()).createChatMentionNotification(any(), any(), any());
    }

    @Test
    void sendMessage_SenderNotMentionedEvenIfNameInMessage() {
        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));
        when(chatMessageRepository.save(any(ChatMessageModel.class))).thenAnswer(inv -> inv.getArgument(0));

        // Message contains @Sender User but sender should be skipped
        chatService.sendMessage(10L, 1L, "I am @Sender User and I say hello");

        verify(notificationService, never()).createChatMentionNotification(any(), any(), any());
    }

    // ── markAsRead ──────────────────────────────────────────────────

    @Test
    void markAsRead_NewStatus_CreatesNew() {
        when(chatReadStatusRepository.findByBandIdAndUserId(10L, 1L)).thenReturn(Optional.empty());
        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(1L)).thenReturn(Optional.of(sender));

        chatService.markAsRead(10L, 1L);

        verify(chatReadStatusRepository).save(any(ChatReadStatus.class));
    }

    @Test
    void markAsRead_ExistingStatus_UpdatesTimestamp() {
        ChatReadStatus existing = new ChatReadStatus();
        existing.setId(50L);
        existing.setLastReadAt(LocalDateTime.now().minusHours(1));

        when(chatReadStatusRepository.findByBandIdAndUserId(10L, 1L)).thenReturn(Optional.of(existing));

        chatService.markAsRead(10L, 1L);

        verify(chatReadStatusRepository).save(existing);
        // lastReadAt should be updated to roughly "now"
        assertTrue(existing.getLastReadAt().isAfter(LocalDateTime.now().minusSeconds(5)));
    }

    // ── hasUnreadMessages ───────────────────────────────────────────

    @Test
    void hasUnreadMessages_True_WhenNewMessageFromOthers() {
        ChatReadStatus status = new ChatReadStatus();
        status.setLastReadAt(LocalDateTime.now().minusHours(1));
        when(chatReadStatusRepository.findByBandIdAndUserId(10L, 1L)).thenReturn(Optional.of(status));

        ChatMessageModel latestMessage = new ChatMessageModel();
        latestMessage.setSender(member); // from another user
        latestMessage.setTimestamp(LocalDateTime.now());
        when(chatMessageRepository.findTopByBandIdOrderByTimestampDesc(10L)).thenReturn(latestMessage);

        assertTrue(chatService.hasUnreadMessages(10L, 1L));
    }

    @Test
    void hasUnreadMessages_False_WhenLatestMessageIsBySameUser() {
        ChatReadStatus status = new ChatReadStatus();
        status.setLastReadAt(LocalDateTime.now().minusHours(1));
        when(chatReadStatusRepository.findByBandIdAndUserId(10L, 1L)).thenReturn(Optional.of(status));

        ChatMessageModel latestMessage = new ChatMessageModel();
        latestMessage.setSender(sender); // sent by the same user checking
        latestMessage.setTimestamp(LocalDateTime.now());
        when(chatMessageRepository.findTopByBandIdOrderByTimestampDesc(10L)).thenReturn(latestMessage);

        assertFalse(chatService.hasUnreadMessages(10L, 1L));
    }

    @Test
    void hasUnreadMessages_False_WhenNoMessages() {
        when(chatReadStatusRepository.findByBandIdAndUserId(10L, 1L)).thenReturn(Optional.empty());
        when(chatMessageRepository.findTopByBandIdOrderByTimestampDesc(10L)).thenReturn(null);

        assertFalse(chatService.hasUnreadMessages(10L, 1L));
    }
}
