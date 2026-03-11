package com.bandanize.backend.repositories;

import com.bandanize.backend.models.SongListModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SongListRepository extends JpaRepository<SongListModel, Long> {
    List<SongListModel> findByBandId(Long bandId);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM SongListModel s LEFT JOIN FETCH s.songs WHERE s.id = :id")
    java.util.Optional<SongListModel> findByIdWithSongs(@org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Query("SELECT MAX(s.orderIndex) FROM SongListModel s WHERE s.band.id = :bandId")
    Integer findMaxOrderIndexByBandId(@org.springframework.data.repository.query.Param("bandId") Long bandId);
}
