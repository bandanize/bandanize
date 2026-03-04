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

    public List<TabCommentModel> getComments(Long tabId) {
        return tabCommentRepository.findByTablatureIdOrderByTimestampAsc(tabId);
    }

    @Transactional
    public TabCommentModel addComment(Long tabId, Long userId, String message) {
        TablatureModel tablature = tablatureRepository.findById(tabId)
                .orElseThrow(() -> new ResourceNotFoundException("Tablature not found"));
        UserModel sender = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        TabCommentModel comment = new TabCommentModel();
        comment.setTablature(tablature);
        comment.setSender(sender);
        comment.setMessage(message);
        comment.setTimestamp(LocalDateTime.now());

        TabCommentModel saved = tabCommentRepository.save(comment);

        // Detect @mentions and send notifications
        if (message.contains("@")) {
            // Navigate up: tablature -> song -> songList -> band
            SongModel song = tablature.getSong();
            if (song != null && song.getSongList() != null) {
                BandModel band = song.getSongList().getBand();
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
    public void deleteComment(Long commentId, Long userId) {
        TabCommentModel comment = tabCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        // Only the author can delete their own comment
        if (!comment.getSender().getId().equals(userId)) {
            throw new IllegalArgumentException("You can only delete your own comments");
        }

        tabCommentRepository.delete(comment);
    }
}
