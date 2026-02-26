package com.bandanize.backend.repositories;

import com.bandanize.backend.models.Notification;
import com.bandanize.backend.models.UserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByBandIdAndRecipientIdOrderByCreatedAtDesc(Long bandId, Long recipientId);

    long countByBandIdAndRecipientIdAndIsReadFalse(Long bandId, Long recipientId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE Notification n SET n.isRead = true WHERE n.band.id = :bandId AND n.recipient.id = :recipientId AND n.isRead = false")
    void markAllAsRead(@org.springframework.data.repository.query.Param("bandId") Long bandId,
            @org.springframework.data.repository.query.Param("recipientId") Long recipientId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM Notification n WHERE n.band.id = :bandId")
    void deleteByBandId(@org.springframework.data.repository.query.Param("bandId") Long bandId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByRecipient(UserModel user);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByActor(UserModel user);
}
