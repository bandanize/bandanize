package com.bandanize.backend.repositories;

import com.bandanize.backend.models.UserModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserModel, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM UserModel u WHERE u.id = :id")
    Optional<UserModel> findByIdForUpdate(@Param("id") Long id);

    Optional<UserModel> findByUsername(String username);

    @Query("SELECT u FROM UserModel u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<UserModel> findByEmail(@Param("email") String email);

    List<UserModel> findByEmailContaining(String email);

    List<UserModel> findByUsernameContaining(String username);

    @Query("SELECT u FROM UserModel u WHERE (LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%'))) AND u.disabled = false")
    List<UserModel> searchUsers(@Param("query") String query);
}