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

        String type = notification.getType().name();
        if (notification.getType() == Notification.NotificationType.CHAT_MENTION && notification.getMetadata() != null) {
            String subtype = notification.getMetadata().get("mentionType");
            if ("TAB_COMMENT_MENTION".equals(subtype) || "TAB_COMMENT_ADDED".equals(subtype)) type = subtype;
        }
        return new com.bandanize.backend.dtos.NotificationDTO(
                notification.getId(),
                type,
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

    public void createTabCommentMentionNotification(BandModel band, UserModel actor, UserModel mentionedUser,
            TablatureModel tab) {
        Notification notification = new Notification();
        notification.setBand(band);
        notification.setActor(actor);
        notification.setRecipient(mentionedUser);
        // Existing installations may retain an enum/check constraint without TAB_COMMENT_MENTION.
        // Persist the established mention type and expose the precise subtype through the DTO.
        notification.setType(Notification.NotificationType.CHAT_MENTION);
        Map<String, String> metadata = new HashMap<>();
        metadata.put("targetUserName", mentionedUser.getName());
        metadata.put("tabName", tab.getName());
        metadata.put("mentionType", "TAB_COMMENT_MENTION");
        notification.setMetadata(metadata);
        notification.setTitle("New Mention");
        notification.setMessage(actor.getName() + " te mencionó en " + tab.getName());
        notificationRepository.save(notification);
    }


    public void createTabCommentNotifications(BandModel band, UserModel actor, TablatureModel tab, TabCommentModel comment) {
        // Keep the established DB enum value; the DTO exposes the comment-specific subtype.
        Map<Long, UserModel> recipients = new java.util.LinkedHashMap<>();
        for (UserModel member : band.getUsers()) recipients.put(member.getId(), member);
        if (band.getOwner() != null) recipients.put(band.getOwner().getId(), band.getOwner());
        recipients.remove(actor.getId());
        for (UserModel recipient : recipients.values()) {
            String name = recipient.getName();
            boolean mentioned = name != null && !name.isBlank() && java.util.regex.Pattern
                .compile("(?<![\\p{L}\\p{N}_@])@" + java.util.regex.Pattern.quote(name) + "(?![\\p{L}\\p{N}_])")
                .matcher(comment.getMessage()).find();
            Map<String, String> metadata = new HashMap<>();
            metadata.put("mentionType", mentioned ? "TAB_COMMENT_MENTION" : "TAB_COMMENT_ADDED");
            metadata.put("tabName", tab.getName());
            metadata.put("tabId", String.valueOf(tab.getId()));
            metadata.put("songId", String.valueOf(tab.getSong().getId()));
            metadata.put("commentId", String.valueOf(comment.getId()));
            Notification notification = new Notification();
            notification.setBand(band); notification.setActor(actor); notification.setRecipient(recipient);
            notification.setType(Notification.NotificationType.CHAT_MENTION);
            notification.setMetadata(metadata);
            notification.setTitle(mentioned ? "New Mention" : "New Comment");
            notification.setMessage(mentioned ? "Mention in tablature comment" : "New tablature comment");
            notificationRepository.save(notification);
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void markAsRead(Long bandId, Long recipientId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .filter(n -> n.getBand().getId().equals(bandId) && n.getRecipient().getId().equals(recipientId))
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notification.setRead(true);
        notificationRepository.save(notification);
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
