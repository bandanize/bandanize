package com.bandanize.backend;

import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.*;
import com.bandanize.backend.services.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.web.reactive.server.WebTestClient;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TabCommentHttpTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired BandRepository bands;
    @Autowired SongRepository songs;
    @Autowired SongListRepository lists;
    @Autowired com.bandanize.backend.services.SongService songService;
    Long songId;
    Long listId;
    @Autowired TablatureRepository tabs;
    @Autowired JwtService jwt;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    Long recipientId;
    Long projectId;
    String recipientUsername;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
    WebTestClient client;
    Long tabId;
    @BeforeEach void setup() {
        String name = "comment-" + UUID.randomUUID();
        new org.springframework.transaction.support.TransactionTemplate(transactionManager).executeWithoutResult(status -> {
        UserModel user = new UserModel();
        user.setUsername(name); user.setEmail(name + "@example.test"); user.setName("Comment Test"); user.setDisabled(false);
        user = users.save(user);
        UserModel recipient = new UserModel(); recipientUsername = name + "-other";
        recipient.setUsername(recipientUsername); recipient.setEmail(recipientUsername + "@example.test");
        recipient.setName("Alex"); recipient.setDisabled(false); recipient = users.save(recipient); recipientId = recipient.getId();
        BandModel band = new BandModel(); band.setName("Comment Test"); band.setOwner(user); band.setUsers(new java.util.ArrayList<>(List.of(user, recipient))); band = bands.save(band); projectId = band.getId();
        SongModel song = new SongModel(); song.setName("Song"); song.setBand(band); song = songs.save(song); songId = song.getId();
        SongListModel list = new SongListModel(); list.setName("Set"); list.setBand(band); list.setSongs(new java.util.ArrayList<>(List.of(song))); listId = lists.save(list).getId();
        TablatureModel tab = new TablatureModel(); tab.setSong(song); tab.setName("Tab"); tab.setContent("Am\nUna melodía\nC"); tabId = tabs.save(tab).getId();
        });
        client = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).defaultHeader("Authorization", "Bearer " + jwt.generateToken(name)).build();
    }

    private void resetSongActivity() {
        jdbc.update("UPDATE song_model SET updated_at = ? WHERE id = ?",
            java.sql.Timestamp.from(java.time.Instant.parse("2000-01-01T00:00:00Z")), songId);
    }
    private void assertSongActivityChanged() {
        org.junit.jupiter.api.Assertions.assertTrue(songs.findById(songId).orElseThrow().getUpdatedAt()
            .isAfter(java.time.Instant.parse("2020-01-01T00:00:00Z")));
    }
    @Test void recentSongActivityPersistsForEditsFilesTabsAndCommentsButNotReordering() {
        org.junit.jupiter.api.Assertions.assertNotNull(songs.findById(songId).orElseThrow().getUpdatedAt());
        resetSongActivity();
        songService.updateSong(songId, Map.of("name", "Updated"));
        assertSongActivityChanged();
        resetSongActivity();
        TablatureModel edit = new TablatureModel(); edit.setContent("New score");
        songService.updateTablature(tabId, edit);
        assertSongActivityChanged();
        resetSongActivity();
        songService.addFileToSong(songId, new MediaFile("notes.txt", "text/plain", "/api/uploads/files/notes.txt"));
        assertSongActivityChanged();
        resetSongActivity();
        songService.addFileToTablature(tabId, new MediaFile("score.txt", "text/plain", "/api/uploads/files/score.txt"));
        assertSongActivityChanged();
        resetSongActivity();
        TablatureModel extra = new TablatureModel(); extra.setName("Bass");
        Long extraId = songService.addTablature(songId, extra).getId();
        assertSongActivityChanged();
        resetSongActivity();
        songService.deleteTablature(extraId);
        assertSongActivityChanged();
        resetSongActivity();
        var comment = client.post().uri("/api/tabs/" + tabId + "/comments").bodyValue(Map.of("message", "New idea"))
            .exchange().expectStatus().isOk().expectBody(Map.class).returnResult().getResponseBody();
        assertSongActivityChanged();
        resetSongActivity();
        client.delete().uri("/api/tabs/" + tabId + "/comments/" + comment.get("id")).exchange().expectStatus().isOk();
        assertSongActivityChanged();
        client.get().uri("/api/bands/my-bands").exchange().expectStatus().isOk().expectBody()
            .jsonPath("$[0].songLists[0].songs[0].updatedAt").isNotEmpty();
        resetSongActivity();
        client.put().uri("/api/songlists/" + listId + "/reorder").bodyValue(List.of(songId))
            .exchange().expectStatus().isOk();
        org.junit.jupiter.api.Assertions.assertEquals(java.time.Instant.parse("2000-01-01T00:00:00Z"),
            songs.findById(songId).orElseThrow().getUpdatedAt());
    }

    @Test void plainCommentSurvivesHttpAndDatabaseRoundTrip() {
        client.post().uri("/api/tabs/" + tabId + "/comments").bodyValue(Map.of("message", "Comentario general"))
            .exchange().expectStatus().isOk().expectBody().jsonPath("$.message").isEqualTo("Comentario general");
        client.get().uri("/api/tabs/" + tabId + "/comments").exchange().expectStatus().isOk().expectBody()
            .jsonPath("$[0].message").isEqualTo("Comentario general");
    }
    @Test void selectedPassageAndAttachmentSurviveHttpAndDatabaseRoundTrip() {
        var request = Map.of("message", "Más suave", "anchorStart", 3, "anchorEnd", 14, "quote", "Una melodía", "attachments",
            List.of(Map.of("name", "Ensayo acústico.wav", "type", "audio/wav", "url", "/api/uploads/audio/123_Ensayo acústico.wav")));
        client.post().uri("/api/tabs/" + tabId + "/comments").bodyValue(request).exchange().expectStatus().isOk()
            .expectBody().jsonPath("$.quote").isEqualTo("Una melodía").jsonPath("$.anchorStart").isEqualTo(3);
        client.get().uri("/api/tabs/" + tabId + "/comments").exchange().expectStatus().isOk().expectBody()
            .jsonPath("$[0].quote").isEqualTo("Una melodía").jsonPath("$[0].attachments[0].name").isEqualTo("Ensayo acústico.wav");
    }

    @Test void mentionsSurviveLegacyNotificationConstraintWithAndWithoutSelection() {
        // Reproduce the constraint retained by an older installation after ddl-auto=update.
        jdbc.execute("ALTER TABLE notifications ADD CONSTRAINT legacy_mentions CHECK (type <> 'TAB_COMMENT_MENTION')");
        try {
            for (boolean selected : List.of(false, true)) {
                java.util.Map<String,Object> body = new java.util.HashMap<>();
                body.put("message", "@Alex revisar");
                if (selected) { body.put("anchorStart", 3); body.put("anchorEnd", 14); body.put("quote", "Una melodía"); }
                client.post().uri("/api/tabs/" + tabId + "/comments").bodyValue(body).exchange().expectStatus().isOk()
                    .expectBody().jsonPath("$.message").isEqualTo("@Alex revisar");
            }
            client.get().uri("/api/tabs/" + tabId + "/comments").exchange().expectStatus().isOk()
                .expectBody().jsonPath("$.length()").isEqualTo(2).jsonPath("$[1].quote").isEqualTo("Una melodía");
            WebTestClient recipientClient = WebTestClient.bindToServer().baseUrl("http://localhost:" + port)
                .defaultHeader("Authorization", "Bearer " + jwt.generateToken(recipientUsername)).build();
            recipientClient.get().uri("/api/projects/" + projectId + "/notifications").exchange().expectStatus().isOk()
                .expectBody().jsonPath("$.length()").isEqualTo(2).jsonPath("$[0].type").isEqualTo("TAB_COMMENT_MENTION");
        } finally { jdbc.execute("ALTER TABLE notifications DROP CONSTRAINT legacy_mentions"); }
    }

    @org.springframework.web.bind.annotation.RestController
    static class LegacyCommentEndpoint {
        @org.springframework.web.bind.annotation.PostMapping("/legacy-comments")
        Map<String,String> comment(@org.springframework.web.bind.annotation.RequestBody Map<String,String> body) { return body; }
    }
    @Test void legacyContractRejectsEmptyAttachmentArrayButAcceptsPlainComments() throws Exception {
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new LegacyCommentEndpoint()).build();
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/legacy-comments")
            .contentType("application/json").content("{\"message\":\"General\",\"attachments\":[]}"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/legacy-comments")
            .contentType("application/json").content("{\"message\":\"General\"}"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
    }


    @Test void newCommentNotificationCanBeReadIndividuallyAndOpenedAgain() {
        for (String message : List.of("General", "@Alex revisar")) {
            client.post().uri("/api/tabs/" + tabId + "/comments").bodyValue(Map.of("message", message)).exchange().expectStatus().isOk();
        }
        WebTestClient recipientClient = WebTestClient.bindToServer().baseUrl("http://localhost:" + port)
            .defaultHeader("Authorization", "Bearer " + jwt.generateToken(recipientUsername)).build();
        var notices = recipientClient.get().uri("/api/projects/" + projectId + "/notifications").exchange().expectStatus().isOk()
            .expectBodyList(com.bandanize.backend.dtos.NotificationDTO.class).returnResult().getResponseBody();
        org.junit.jupiter.api.Assertions.assertEquals(2, notices.size());
        org.junit.jupiter.api.Assertions.assertEquals("TAB_COMMENT_MENTION", notices.get(0).getType());
        org.junit.jupiter.api.Assertions.assertEquals("TAB_COMMENT_ADDED", notices.get(1).getType());
        org.junit.jupiter.api.Assertions.assertEquals(String.valueOf(tabId), notices.get(0).getMetadata().get("tabId"));
        for (int attempt=0; attempt<2; attempt++) {
            recipientClient.post().uri("/api/projects/" + projectId + "/notifications/" + notices.get(0).getId() + "/read")
                .exchange().expectStatus().isOk();
        }
        recipientClient.get().uri("/api/projects/" + projectId + "/notifications/unread-count")
            .exchange().expectStatus().isOk().expectBody(Long.class).isEqualTo(1L);
        recipientClient.get().uri("/api/projects/" + projectId + "/notifications").exchange().expectStatus().isOk().expectBody()
            .jsonPath("$[0].isRead").isEqualTo(true).jsonPath("$[1].isRead").isEqualTo(false);
    }


    private WebTestClient readerClient() {
        return WebTestClient.bindToServer().baseUrl("http://localhost:" + port)
            .defaultHeader("Authorization", "Bearer " + jwt.generateToken(recipientUsername)).build();
    }
    private WebTestClient.BodyContentSpec unread(WebTestClient reader) {
        return reader.get().uri("/api/bands/" + projectId + "/song-unread").exchange().expectStatus().isOk().expectBody();
    }
    @Test void songUnreadIsPerUserPerResourceAndPersistsAcrossRequests() {
        var comment = client.post().uri("/api/tabs/" + tabId + "/comments").bodyValue(Map.of("message", "Listen here"))
            .exchange().expectStatus().isOk().expectBody(Map.class).returnResult().getResponseBody();
        String commentId = comment.get("id").toString();
        songService.addFileToSong(songId, new MediaFile("Song notes", "text/plain", "/api/uploads/files/shared.txt"));
        songService.addFileToTablature(tabId, new MediaFile("Tab notes", "text/plain", "/api/uploads/files/shared.txt"));
        WebTestClient reader = readerClient();
        unread(reader).jsonPath("$[0].tabs.length()").isEqualTo(1)
            .jsonPath("$[0].comments[0]").isEqualTo(commentId).jsonPath("$[0].files.length()").isEqualTo(2);
        unread(client).jsonPath("$[0].comments.length()").isEqualTo(0); // Own comment isn't unread.
        reader.post().uri("/api/songs/" + songId + "/seen")
            .bodyValue(Map.of("tabs", List.of(tabId.toString(), "999999"), "files", List.of("song:/api/uploads/files/shared.txt")))
            .exchange().expectStatus().isOk();
        unread(readerClient()).jsonPath("$[0].tabs.length()").isEqualTo(0)
            .jsonPath("$[0].comments.length()").isEqualTo(1)
            .jsonPath("$[0].files[0]").isEqualTo("tab:" + tabId + ":/api/uploads/files/shared.txt");
        unread(client).jsonPath("$[0].tabs.length()").isEqualTo(1).jsonPath("$[0].files.length()").isEqualTo(2);
        reader.post().uri("/api/songs/" + songId + "/seen")
            .bodyValue(Map.of("comments", List.of(commentId))).exchange().expectStatus().isOk();
        unread(reader).jsonPath("$[0].comments.length()").isEqualTo(0);
        client.delete().uri("/api/tabs/" + tabId + "/comments/" + commentId).exchange().expectStatus().isOk();
        var replacement = client.post().uri("/api/tabs/" + tabId + "/comments").bodyValue(Map.of("message", "A new comment with unchanged total count"))
            .exchange().expectStatus().isOk().expectBody(Map.class).returnResult().getResponseBody();
        unread(reader).jsonPath("$[0].comments[0]").isEqualTo(replacement.get("id").toString());
        TablatureModel next = new TablatureModel(); next.setName("Bass");
        Long nextId = songService.addTablature(songId, next).getId();
        unread(reader).jsonPath("$[0].tabs[0]").isEqualTo(nextId.toString());
        // Persisted receipts must not block deletion of their song.
        client.delete().uri("/api/songs/" + songId + "?listId=" + listId).exchange().expectStatus().isNoContent();
        org.junit.jupiter.api.Assertions.assertEquals(0,
            jdbc.queryForObject("SELECT COUNT(*) FROM song_read_state WHERE song_id = ?", Integer.class, songId));
    }
    @Test void unreadAccessRequiresMembershipAndCannotMarkFutureIdsSeen() {
        UserModel outsider = new UserModel();
        String username = "outside-" + UUID.randomUUID();
        outsider.setUsername(username); outsider.setEmail(username + "@example.test"); outsider.setName("Outside"); outsider.setDisabled(false);
        users.save(outsider);
        WebTestClient stranger = WebTestClient.bindToServer().baseUrl("http://localhost:" + port)
            .defaultHeader("Authorization", "Bearer " + jwt.generateToken(username)).build();
        stranger.get().uri("/api/bands/" + projectId + "/song-unread").exchange().expectStatus().isForbidden();
        stranger.post().uri("/api/songs/" + songId + "/seen")
            .bodyValue(Map.of("tabs", List.of(tabId.toString()))).exchange().expectStatus().isForbidden();
        readerClient().post().uri("/api/songs/" + songId + "/seen")
            .bodyValue(Map.of("files", List.of("song:/api/uploads/files/future.txt"))).exchange().expectStatus().isOk();
        songService.addFileToSong(songId, new MediaFile("Future", "text/plain", "/api/uploads/files/future.txt"));
        unread(readerClient()).jsonPath("$[0].files[0]").isEqualTo("song:/api/uploads/files/future.txt");
        readerClient().post().uri("/api/songs/" + songId + "/seen")
            .bodyValue(Map.of("everything", List.of("1"))).exchange().expectStatus().isBadRequest();
    }
}
