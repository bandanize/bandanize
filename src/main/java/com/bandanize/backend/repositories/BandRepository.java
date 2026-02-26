package com.bandanize.backend.repositories;

import com.bandanize.backend.models.BandModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BandRepository extends JpaRepository<BandModel, Long> {
    List<BandModel> findByName(String name);

    List<BandModel> findByGenre(String genre);

    List<BandModel> findByOwner(com.bandanize.backend.models.UserModel owner);

    Optional<BandModel> findByCalendarToken(String calendarToken);
}