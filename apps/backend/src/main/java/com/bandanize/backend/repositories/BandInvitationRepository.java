package com.bandanize.backend.repositories;

import com.bandanize.backend.models.BandInvitationModel;
import com.bandanize.backend.models.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BandInvitationRepository extends JpaRepository<BandInvitationModel, Long> {
    List<BandInvitationModel> findByInvitedUserIdAndStatus(Long userId, InvitationStatus status);

    Optional<BandInvitationModel> findByBandIdAndInvitedUserId(Long bandId, Long userId);

    void deleteByInvitedUser(com.bandanize.backend.models.UserModel invitedUser);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM BandInvitationModel b WHERE b.band.id = :bandId")
    void deleteByBandId(@org.springframework.data.repository.query.Param("bandId") Long bandId);
}
