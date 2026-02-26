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
                    assertThat(body).contains("DTSTART:20260520T200000");
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
                .exchange()
                .expectStatus().isOk()
                .expectBody(String.class).consumeWith(response -> {
                    String body = response.getResponseBody();
                    assertThat(body).contains("X-WR-CALNAME:Legacy Band Name");
                    assertThat(body).contains("SUMMARY:ConcertLegacy");
                });
    }
}
