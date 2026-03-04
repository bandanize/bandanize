package com.bandanize.backend.repositories;

import com.bandanize.backend.models.TabCommentModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TabCommentRepository extends JpaRepository<TabCommentModel, Long> {
    List<TabCommentModel> findByTablatureIdOrderByTimestampAsc(Long tablatureId);
}
