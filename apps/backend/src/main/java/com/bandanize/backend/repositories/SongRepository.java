package com.bandanize.backend.repositories;

import com.bandanize.backend.models.SongModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SongRepository extends JpaRepository<SongModel, Long> {
}
