package com.bandanize.backend.repositories;

import com.bandanize.backend.models.SongListModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SongListRepository extends JpaRepository<SongListModel, Long> {
    List<SongListModel> findByBandId(Long bandId);
}
