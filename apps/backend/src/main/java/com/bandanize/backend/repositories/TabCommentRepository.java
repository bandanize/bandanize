package com.bandanize.backend.repositories;

import com.bandanize.backend.models.TabCommentModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TabCommentRepository extends JpaRepository<TabCommentModel, Long> {
    List<TabCommentModel> findBySender(com.bandanize.backend.models.UserModel sender);
    interface ActivityId {
        Long getId();
        Long getSongId();
        Long getSenderId();
    }
    @org.springframework.data.jpa.repository.Query("SELECT c.id AS id, c.tablature.song.id AS songId, c.sender.id AS senderId FROM TabCommentModel c WHERE c.tablature.song.band.id = :bandId")
    List<ActivityId> findActivityIds(@org.springframework.data.repository.query.Param("bandId") Long bandId);

    List<TabCommentModel> findByTablatureIdOrderByTimestampAsc(Long tablatureId);
}
