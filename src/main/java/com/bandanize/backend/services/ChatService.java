package com.bandanize.backend.services;

import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.models.ChatMessageModel;
import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.ChatMessageRepository;
import com.bandanize.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ChatService {
    @Autowired
    private ChatMessageRepository chatMessageRepository;
    @Autowired
    private BandRepository bandRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private com.bandanize.backend.repositories.ChatReadStatusRepository chatReadStatusRepository;

    public List<ChatMessageModel> getChatHistory(Long bandId) {
        return chatMessageRepository.findByBandIdOrderByTimestampAsc(bandId);
    }

    @org.springframework.transaction.annotation.Transactional
    public ChatMessageModel sendMessage(Long bandId, Long userId, String message) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found"));
        UserModel sender = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ChatMessageModel chatMessage = new ChatMessageModel();
        chatMessage.setBand(band);
        chatMessage.setSender(sender);
        chatMessage.setMessage(message);
        chatMessage.setTimestamp(LocalDateTime.now());

        ChatMessageModel savedMessage = chatMessageRepository.save(chatMessage);

        // Check for mentions (Simple implementation: @Name)

        if (message.contains("@")) {
            // Very basic: iterate over band members and check if their name is the
            // message
            for (UserModel member : band.getUsers()) {
                if (member.getId().equals(sender.getId()))
                    continue;

                String mention = "@" + member.getName();
                if (message.contains(mention)) {
                    notificationService.createChatMentionNotification(band, sender, member);
                }
            }
        }

        return savedMessage;
    }

    public void markAsRead(Long bandId, Long userId) {
        com.bandanize.backend.models.ChatReadStatus status = chatReadStatusRepository
                .findByBandIdAndUserId(bandId, userId)
                .orElse(new com.bandanize.backend.models.ChatReadStatus());

        if (status.getId() == null) {
            BandModel band = bandRepository.findById(bandId)
                    .orElseThrow(() -> new ResourceNotFoundException("Band not found"));
            UserModel user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            status.setBand(band);
            status.setUser(user);
        }

        status.setLastReadAt(LocalDateTime.now());
        chatReadStatusRepository.save(status);
    }

    public boolean hasUnreadMessages(Long bandId, Long userId) {
        LocalDateTime lastRead = chatReadStatusRepository.findByBandIdAndUserId(bandId, userId)
                .map(com.bandanize.backend.models.ChatReadStatus::getLastReadAt)
                .orElse(LocalDateTime.MIN); // If no record, assume unread since beginning of time

        // Check if there are any messages after lastRead
        // Optimize: count > 0. For now, findFirst is okay or exists logic.
        // Or simpler: get latest message timestamp and compare.
        ChatMessageModel latestMessage = chatMessageRepository.findTopByBandIdOrderByTimestampDesc(bandId);

        if (latestMessage == null)
            return false;

        // If latest message is from the user themselves, it's not "unread" in the sense
        // of notification needed
        if (latestMessage.getSender() != null && latestMessage.getSender().getId().equals(userId)) {
            return false;
        }

        return latestMessage.getTimestamp().isAfter(lastRead);
    }
}
