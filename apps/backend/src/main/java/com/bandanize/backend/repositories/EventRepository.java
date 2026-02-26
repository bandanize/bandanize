package com.bandanize.backend.repositories;

import com.bandanize.backend.models.EventModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<EventModel, Long> {
    List<EventModel> findByBandIdOrderByDateAsc(Long bandId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("DELETE FROM EventModel e WHERE e.band.id = :bandId")
    void deleteByBandId(@org.springframework.data.repository.query.Param("bandId") Long bandId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByCreatorId(Long creatorId);
}
