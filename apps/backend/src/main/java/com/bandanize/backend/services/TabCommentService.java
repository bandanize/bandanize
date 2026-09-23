package com.bandanize.backend.services;

import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.TabCommentRepository;
import com.bandanize.backend.repositories.TablatureRepository;
import com.bandanize.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import com.bandanize.backend.dtos.TabCommentRequest;
import org.springframework.security.access.AccessDeniedException;
import java.util.List;

@Service
public class TabCommentService {

    @Autowired
    private TabCommentRepository tabCommentRepository;

    @Autowired
    private TablatureRepository tablatureRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<TabCommentModel> getComments(Long tabId, Long userId) {
        requireAccess(tabId, userId);
        return tabCommentRepository.findByTablatureIdOrderByTimestampAsc(tabId);
    }

    @Transactional
    public TabCommentModel addComment(Long tabId, Long userId, TabCommentRequest request) {
        TablatureModel tablature = requireAccess(tabId, userId);
        String message = request.message() == null ? "" : request.message().trim();
        List<MediaFile> attachments = request.attachments() == null ? List.of() : request.attachments();
        if ((message.isEmpty() && attachments.isEmpty()) || message.length() > 10000 || attachments.size() > 5)
            throw new IllegalArgumentException("Write a comment or attach a file (maximum 5 files).");
        boolean anchored = request.anchorStart() != null || request.anchorEnd() != null || request.quote() != null;
        if (anchored) {
            String content = tablature.getContent() == null ? "" : tablature.getContent();
            if (request.anchorStart() == null || request.anchorEnd() == null || request.quote() == null
                    || request.anchorStart() < 0 || request.anchorEnd() <= request.anchorStart()
                    || request.anchorEnd() > content.length() || request.quote().length() > 2000
                    || !content.substring(request.anchorStart(), request.anchorEnd()).equals(request.quote()))
                throw new IllegalArgumentException("The selected passage has changed. Select it again before commenting.");
        }
        for (MediaFile file : attachments) {
            if (file == null || file.getName() == null || file.getName().isBlank() || file.getName().length() > 200
                    || file.getType() == null || file.getType().length() > 150 || file.getUrl() == null
                    || !file.getUrl().matches("^/api/uploads/(images|audio|videos|files)/[^/\\\\?#%\\p{Cntrl}]+$")
                    || file.getUrl().contains(".."))
                throw new IllegalArgumentException("Invalid comment attachment.");
        }
        UserModel sender = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        TabCommentModel comment = new TabCommentModel();
        comment.setTablature(tablature);
        comment.setSender(sender);
        comment.setMessage(message);
        comment.setAnchorStart(request.anchorStart());
        comment.setAnchorEnd(request.anchorEnd());
        comment.setQuote(request.quote());
        comment.setAttachments(new java.util.ArrayList<>(attachments));
        comment.setTimestamp(LocalDateTime.now());

        TabCommentModel saved = tabCommentRepository.save(comment);

        // Detect @mentions and send notifications
        if (message.contains("@")) {
            // Navigate up: tablature -> song -> band
            SongModel song = tablature.getSong();
            if (song != null && song.getBand() != null) {
                BandModel band = song.getBand();
                if (band != null) {
                    for (UserModel member : band.getUsers()) {
                        if (member.getId().equals(sender.getId()))
                            continue;

                        String mention = "@" + member.getName();
                        if (message.contains(mention)) {
                            notificationService.createTabCommentMentionNotification(
                                    band, sender, member, tablature);
                        }
                    }
                }
            }
        }

        return saved;
    }

    @Transactional
    public void deleteComment(Long tabId, Long commentId, Long userId) {
        TabCommentModel comment = tabCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        requireAccess(tabId, userId);
        if (!comment.getTablature().getId().equals(tabId)) throw new ResourceNotFoundException("Comment not found");
        // Only the author can delete their own comment
        if (!comment.getSender().getId().equals(userId)) {
            throw new AccessDeniedException("You can only delete your own comments");
        }

        tabCommentRepository.delete(comment);
    }
    private TablatureModel requireAccess(Long tabId, Long userId) {
        TablatureModel tab = tablatureRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tablature not found"));
        BandModel band = tab.getSong() == null ? null : tab.getSong().getBand();
        boolean allowed = band != null && ((band.getOwner() != null && userId.equals(band.getOwner().getId()))
                || band.getUsers().stream().anyMatch(user -> userId.equals(user.getId())));
        if (!allowed) throw new AccessDeniedException("You must belong to this project.");
        return tab;
    }
}
