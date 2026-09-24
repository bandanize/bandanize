package com.bandanize.backend.repositories;

import com.bandanize.backend.models.SongReadState;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SongReadStateRepository extends JpaRepository<SongReadState, Long> {
    List<SongReadState> findByUserIdAndSongBandId(Long userId, Long bandId);
    Optional<SongReadState> findByUserIdAndSongId(Long userId, Long songId);
}
