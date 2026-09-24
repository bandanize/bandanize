package com.bandanize.backend.controllers;

import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.models.EventModel;
import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.EventRepository;
import com.bandanize.backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class EventControllerTest {
    @org.springframework.test.context.bean.override.mockito.MockitoBean private com.bandanize.backend.services.ResourceAccess access;

    @LocalServerPort
    private int port;

    private WebTestClient webClient;

    @Autowired
    private BandRepository bandRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    public void setUp() {
        webClient = WebTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .build();

        eventRepository.deleteAll();
        bandRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    public void testGetCalendarFeedByToken() {
        // Create User
        UserModel user = new UserModel();
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setHashedPassword("password");
        user = userRepository.save(user);

        // Create Band
        BandModel band = new BandModel();
        band.setName("Test Band");
        band.setOwner(user);
        band.setCalendarToken(UUID.randomUUID().toString());
        band = bandRepository.save(band);

        // Create Event
        EventModel event = new EventModel();
        event.setName("Concert");
        event.setDate(LocalDateTime.of(2026, 5, 20, 20, 0));
        event.setType("CONCIERTO");
        event.setDescription("Big show");
        event.setLocation("Madrid");
        event.setCreatedAt(LocalDateTime.now());
        event.setBand(band);
        event.setCreator(user);
        eventRepository.save(event);

        String token = band.getCalendarToken();

        webClient.get().uri("/api/calendar/" + token + ".ics")
                .exchange()
                .expectStatus().isOk()
                .expectHeader().valueEquals("Content-Disposition", "attachment; filename=\"calendar.ics\"")
                .expectBody(String.class).consumeWith(response -> {
                    String body = response.getResponseBody();
                    assertThat(body).contains("BEGIN:VCALENDAR");
                    assertThat(body).contains("X-WR-CALNAME:Test Band");
                    assertThat(body).contains("SUMMARY:Concert");
                    assertThat(body).contains("DTSTART:20260520T180000Z");
                    assertThat(body).contains("END:VCALENDAR");
                });
    }

    @Test
    public void testGetCalendarFeedLegacy() {
        // Create User
        UserModel user = new UserModel();
        user.setUsername("testuser2");
        user.setEmail("test2@example.com");
        user.setHashedPassword("password");
        user = userRepository.save(user);

        // Create Band
        BandModel band = new BandModel();
        band.setName("Legacy Band Name");
        band.setOwner(user);
        band = bandRepository.save(band);

        // Create Event
        EventModel event = new EventModel();
        event.setName("ConcertLegacy");
        event.setDate(LocalDateTime.of(2026, 5, 20, 20, 0));
        event.setType("CONCIERTO");
        event.setBand(band);
        event.setCreator(user);
        eventRepository.save(event);

        Long bandId = band.getId();

        webClient.get().uri("/api/bands/" + bandId + "/calendar.ics")
                .exchange().expectStatus().isEqualTo(410);
    }

    @Test public void sameSubscriptionUrlReflectsNewChangedAndDeletedEvents() {
        UserModel user = new UserModel(); user.setUsername("live"); user.setEmail("live@example.test"); user = userRepository.save(user);
        BandModel band = new BandModel(); band.setName("Live"); band.setOwner(user); band.setCalendarToken(UUID.randomUUID().toString()); band = bandRepository.save(band);
        String path = "/api/calendar/" + band.getCalendarToken() + ".ics";
        String empty = webClient.get().uri(path).exchange().expectStatus().isOk().expectHeader().valueEquals("Cache-Control","no-cache, max-age=0, must-revalidate").expectBody(String.class).returnResult().getResponseBody();
        assertThat(empty).doesNotContain("BEGIN:VEVENT");
        EventModel event = new EventModel(); event.setName("New rehearsal"); event.setBand(band); event.setCreator(user);
        event.setDate(LocalDateTime.of(2026,7,20,20,0)); event.setTimeZone("Europe/Madrid"); event = eventRepository.save(event);
        String first = webClient.get().uri(path).exchange().expectStatus().isOk().expectBody(String.class).returnResult().getResponseBody();
        assertThat(first).contains("DTSTART:20260720T180000Z", "SEQUENCE:0", "UID:" + event.getId() + "@bandanize");
        event.setName("Changed rehearsal"); event.setDate(LocalDateTime.of(2026,7,20,21,0)); event = eventRepository.save(event);
        String changed = webClient.get().uri(path).exchange().expectStatus().isOk().expectBody(String.class).returnResult().getResponseBody();
        assertThat(changed).contains("DTSTART:20260720T190000Z", "SEQUENCE:1", "SUMMARY:Changed rehearsal", "UID:" + event.getId() + "@bandanize").doesNotContain("SUMMARY:New rehearsal");
        eventRepository.deleteById(event.getId());
        String deleted = webClient.get().uri(path).exchange().expectStatus().isOk().expectBody(String.class).returnResult().getResponseBody();
        assertThat(deleted).doesNotContain("BEGIN:VEVENT");
    }

}
