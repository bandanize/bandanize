package com.bandanize.backend.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class DatabaseMigrationService {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseMigrationService.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void runAfterStartup() {
        logger.info("Checking for Issue #85 data migration...");

        // 1. Check if the old columns exist in song_model
        try {
            boolean hasSongListId = checkColumnExists("song_model", "song_list_id");
            if (!hasSongListId) {
                logger.info("No 'song_list_id' column found in 'song_model'. Migration already applied or not needed.");
                return;
            }

            // 2. Populate band_id in song_model from song_list_model
            logger.info("Migrating band_id for songs...");
            jdbcTemplate.update("" +
                    "UPDATE song_model s " +
                    "SET band_id = (SELECT band_id FROM song_list_model sl WHERE sl.id = s.song_list_id) " +
                    "WHERE band_id IS NULL AND song_list_id IS NOT NULL");

            // 3. Populate songlist_songs join table
            logger.info("Migrating songlist_songs mappings...");
            List<Map<String, Object>> songLists = jdbcTemplate.queryForList(
                    "SELECT DISTINCT song_list_id FROM song_model WHERE song_list_id IS NOT NULL");

            for (Map<String, Object> listRecord : songLists) {
                Long songListId = ((Number) listRecord.get("song_list_id")).longValue();

                List<Map<String, Object>> songsInList = jdbcTemplate.queryForList(
                        "SELECT id FROM song_model WHERE song_list_id = ? ORDER BY order_index ASC, id ASC",
                        songListId);

                for (Map<String, Object> songRecord : songsInList) {
                    Long songId = ((Number) songRecord.get("id")).longValue();

                    Integer count = jdbcTemplate.queryForObject(
                            "SELECT COUNT(*) FROM songlist_songs WHERE song_list_id = ? AND song_id = ?",
                            Integer.class, songListId, songId);

                    if (count != null && count == 0) {
                        Integer maxOrder = jdbcTemplate.queryForObject(
                                "SELECT MAX(order_index) FROM songlist_songs WHERE song_list_id = ?",
                                Integer.class, songListId);
                        int nextIndex = (maxOrder != null) ? maxOrder + 1 : 0;

                        jdbcTemplate.update(
                                "INSERT INTO songlist_songs (song_list_id, song_id, order_index) VALUES (?, ?, ?)",
                                songListId, songId, nextIndex);
                    }
                }
            }

            logger.info(
                    "Migration for Issue #85 completed. You may drop 'song_list_id' and 'order_index' from 'song_model' later.");
        } catch (Exception e) {
            logger.error("Error during data migration: ", e);
        }
    }

    private boolean checkColumnExists(String tableName, String columnName) {
        String sql = "SELECT column_name FROM information_schema.columns WHERE table_name = ? AND column_name = ?";
        List<String> columns = jdbcTemplate.queryForList(sql, String.class, tableName, columnName);
        return !columns.isEmpty();
    }
}
