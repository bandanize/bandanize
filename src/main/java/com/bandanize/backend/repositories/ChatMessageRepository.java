package com.bandanize.backend.repositories;

import com.bandanize.backend.models.ChatMessageModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessageModel, Long> {
    List<ChatMessageModel> findByBandIdOrderByTimestampAsc(Long bandId);

    List<ChatMessageModel> findBySender(com.bandanize.backend.models.UserModel sender);

    ChatMessageModel findTopByBandIdOrderByTimestampDesc(Long bandId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM ChatMessageModel c WHERE c.band.id = :bandId")
    void deleteByBandId(@org.springframework.data.repository.query.Param("bandId") Long bandId);
}
