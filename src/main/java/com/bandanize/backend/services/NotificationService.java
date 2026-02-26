package com.bandanize.backend.services;

import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private BandRepository bandRepository;

    public List<com.bandanize.backend.dtos.NotificationDTO> getProjectNotifications(Long projectId, Long userId) {
        return notificationRepository.findByBandIdAndRecipientIdOrderByCreatedAtDesc(projectId, userId).stream()
                .map(this::convertToDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    private com.bandanize.backend.dtos.NotificationDTO convertToDTO(Notification notification) {
        com.bandanize.backend.dtos.UserSummaryDTO actorDTO = null;
        if (notification.getActor() != null) {
            actorDTO = new com.bandanize.backend.dtos.UserSummaryDTO(
                    notification.getActor().getId(),
                    notification.getActor().getUsername(),
                    notification.getActor().getName(),
                    notification.getActor().getEmail(),
                    notification.getActor().getPhoto());
        }

        return new com.bandanize.backend.dtos.NotificationDTO(
                notification.getId(),
                notification.getType().name(),
                notification.getMetadata(),
                notification.getCreatedAt(),
                actorDTO,
                notification.getTitle(),
                notification.getMessage(),
                notification.isRead());
    }

    public void createListNotification(BandModel band, UserModel actor, SongListModel list) {
        createNotification(band, actor, Notification.NotificationType.LIST_CREATED,
                Map.of("listName", list.getName()),
                "New List",
                actor.getName() + " created list " + list.getName());
    }

    public void createSongNotification(BandModel band, UserModel actor, SongModel song) {
        createNotification(band, actor, Notification.NotificationType.SONG_ADDED,
                Map.of("songName", song.getName()),
                "New Song",
                actor.getName() + " added song " + song.getName());
    }

    public void createMemberAddedNotification(BandModel band, UserModel actor, UserModel removedUser) {
        // Actor is the one who added/invited/accepted? Or the new member?
        // Typically "User accepted invitation".
        // If it comes from invite acceptance, actor is the new member.
        createNotification(band, actor, Notification.NotificationType.MEMBER_ADDED,
                Map.of("memberName", actor.getName()),
                "New Member",
                actor.getName() + " joined the band");
    }

    public void createChatMentionNotification(BandModel band, UserModel actor, UserModel mentionedUser) {
        // We only notify the mentioned user
        Notification notification = new Notification();
        notification.setBand(band);
        notification.setActor(actor);
        notification.setRecipient(mentionedUser);
        notification.setType(Notification.NotificationType.CHAT_MENTION);
        notification.setMetadata(Map.of("targetUserName", mentionedUser.getName()));
        notification.setTitle("New Mention");
        notification.setMessage(actor.getName() + " te mencionó");
        // Use a simpler timestamp or let DB handle it
        // notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);
    }

    public void createEventNotification(BandModel band, UserModel actor, EventModel event, boolean isModification) {
        Notification.NotificationType type = isModification
                ? Notification.NotificationType.EVENT_MODIFIED
                : Notification.NotificationType.EVENT_CREATED;

        String action = isModification ? "updated" : "created";
        String title = isModification ? "Event Updated" : "New Event";
        createNotification(band, actor, type, Map.of("eventName", event.getName()),
                title,
                actor.getName() + " " + action + " event " + event.getName());
    }

    public void tabCreatedNotification(BandModel band, UserModel actor, TablatureModel tab) {
        createNotification(band, actor, Notification.NotificationType.TAB_CREATED,
                Map.of("tabName", tab.getName(), "songName", tab.getSong().getName()),
                "New Tab",
                actor.getName() + " added tab " + tab.getName() + " to " + tab.getSong().getName());
    }

    private void createNotification(BandModel band, UserModel actor, Notification.NotificationType type,
            Map<String, String> metadata, String title, String message) {

        List<UserModel> recipients = band.getUsers();

        for (UserModel recipient : recipients) {
            // Optional: Don't notify the actor of their own action?
            // Usually yes, skip actor.
            if (recipient.getId().equals(actor.getId())) {
                continue;
            }

            Notification notification = new Notification();
            notification.setBand(band);
            notification.setActor(actor);
            notification.setRecipient(recipient);
            notification.setType(type);
            notification.setMetadata(metadata);
            notification.setTitle(title);
            notification.setMessage(message);

            notificationRepository.save(notification);
        }
    }

    public long getUnreadCount(Long bandId, Long recipientId) {
        return notificationRepository.countByBandIdAndRecipientIdAndIsReadFalse(bandId, recipientId);
    }

    public void markAllAsRead(Long bandId, Long recipientId) {
        notificationRepository.markAllAsRead(bandId, recipientId);
    }
}
