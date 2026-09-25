package com.bandanize.backend.repositories;

import com.bandanize.backend.models.TablatureModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TablatureRepository extends JpaRepository<TablatureModel, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select tab from TablatureModel tab where tab.id = :id")
    java.util.Optional<TablatureModel> findForEditing(@org.springframework.data.repository.query.Param("id") Long id);
}

