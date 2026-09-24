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
        SongModel song = new SongModel(); song.setName("Song"); song.setBand(band); song = songs.save(song);
        TablatureModel tab = new TablatureModel(); tab.setSong(song); tab.setName("Tab"); tab.setContent("Am\nUna melodía\nC"); tabId = tabs.save(tab).getId();
        });
        client = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).defaultHeader("Authorization", "Bearer " + jwt.generateToken(name)).build();
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

}
