package com.bandanize.backend.controllers;

import com.bandanize.backend.dtos.EventDTO;
import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.EventModel;
import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.repositories.UserRepository;
import com.bandanize.backend.services.BandService;
import com.bandanize.backend.services.EventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api")
public class EventController {
    @Autowired private com.bandanize.backend.services.ResourceAccess access;

    @Autowired
    private EventService eventService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BandService bandService;

    private Long getCurrentUserId(Principal principal) {
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found")).getId();
    }

    @GetMapping("/bands/{bandId}/events")
    public ResponseEntity<List<EventDTO>> getEvents(@PathVariable Long bandId) {
        access.band(bandId);
        List<EventDTO> dtos = eventService.getEventsByBand(bandId)
                .stream()
                .map(EventDTO::fromModel)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/bands/{bandId}/events")
    public ResponseEntity<EventDTO> createEvent(@PathVariable Long bandId, @RequestBody EventModel event,
            Principal principal) {
        access.band(bandId);
        EventModel created = eventService.createEvent(bandId, getCurrentUserId(principal), event);
        return ResponseEntity.ok(EventDTO.fromModel(created));
    }

    @PutMapping("/events/{eventId}")
    public ResponseEntity<EventDTO> updateEvent(@PathVariable Long eventId, @RequestBody EventModel event,
            Principal principal) {
        access.event(eventId);
        EventModel updated = eventService.updateEvent(eventId, getCurrentUserId(principal), event);
        return ResponseEntity.ok(EventDTO.fromModel(updated));
    }

    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long eventId) {
        access.event(eventId);
        eventService.deleteEvent(eventId);
        return ResponseEntity.ok().build();
    }

    /**
     * Public iCal subscription endpoint.
     * Returns a live .ics feed that calendar apps can subscribe to.
     * No authentication required — calendar apps can't send JWT tokens.
     */
    /**
     * Public iCal subscription endpoint (SECURE).
     * Returns a live .ics feed that calendar apps can subscribe to, using a secure
     * token.
     */
    @GetMapping(value = "/calendar/{token}.ics", produces = "text/calendar;charset=UTF-8")
    public ResponseEntity<String> getCalendarFeedByToken(@PathVariable String token) {
        BandModel band = bandService.getBandByCalendarToken(token);
        List<EventModel> events = eventService.getEventsByBand(band.getId());
        return ResponseEntity.ok()
                .header("Cache-Control", "no-cache, max-age=0, must-revalidate")
                .header("Content-Disposition", "attachment; filename=\"calendar.ics\"")
                .body(com.bandanize.backend.services.CalendarFeedWriter.write(band.getName(), events));
    }

    /**
     * Public iCal subscription endpoint (LEGACY/INSECURE).
     * 
     * @deprecated Use /calendar/{token}.ics instead
     */
    @Deprecated
    @GetMapping(value = "/bands/{bandId}/calendar.ics", produces = "text/calendar;charset=UTF-8")
    public ResponseEntity<String> getCalendarFeed(@PathVariable Long bandId) {
        return ResponseEntity.status(410).build();
    }

}
