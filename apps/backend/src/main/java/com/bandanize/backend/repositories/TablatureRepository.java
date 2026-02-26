package com.bandanize.backend.repositories;

import com.bandanize.backend.models.TablatureModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TablatureRepository extends JpaRepository<TablatureModel, Long> {
}
