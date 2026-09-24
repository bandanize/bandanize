package com.bandanize.backend.services;

import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.models.EventModel;
import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.EventRepository;
import com.bandanize.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EventService {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private BandRepository bandRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    public List<EventModel> getEventsByBand(Long bandId) {
        return eventRepository.findByBandIdOrderByDateAsc(bandId);
    }

    @org.springframework.transaction.annotation.Transactional
    public EventModel createEvent(Long bandId, Long userId, EventModel eventDetails) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found"));
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateCalendarDate(eventDetails.getDate(), eventDetails.effectiveTimeZone());
        eventDetails.setTimeZone(eventDetails.effectiveTimeZone());
        eventDetails.setBand(band);
        eventDetails.setCreator(user);

        EventModel savedEvent = eventRepository.save(eventDetails);

        // Notify
        notificationService.createEventNotification(band, user, savedEvent, false);

        return savedEvent;
    }

    @org.springframework.transaction.annotation.Transactional
    public EventModel updateEvent(Long eventId, Long userId, EventModel eventDetails) {
        EventModel event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String timeZone = eventDetails.getTimeZone() == null ? event.effectiveTimeZone() : eventDetails.getTimeZone();
        validateCalendarDate(eventDetails.getDate() == null ? event.getDate() : eventDetails.getDate(), timeZone);
        event.setTimeZone(timeZone);

        if (eventDetails.getName() != null)
            event.setName(eventDetails.getName());
        if (eventDetails.getDescription() != null)
            event.setDescription(eventDetails.getDescription());
        if (eventDetails.getDate() != null)
            event.setDate(eventDetails.getDate());
        if (eventDetails.getType() != null)
            event.setType(eventDetails.getType());
        if (eventDetails.getLocation() != null)
            event.setLocation(eventDetails.getLocation());

        EventModel updatedEvent = eventRepository.save(event);

        // Notify modification
        notificationService.createEventNotification(event.getBand(), user, updatedEvent, true);

        return updatedEvent;
    }

    private void validateCalendarDate(java.time.LocalDateTime date, String timeZone) {
        if (date == null) throw new IllegalArgumentException("Event date is required.");
        java.time.ZoneId zone;
        try { zone = java.time.ZoneId.of(timeZone); }
        catch (java.time.DateTimeException | NullPointerException ex) { throw new IllegalArgumentException("Invalid time zone."); }
        if (zone.getRules().getValidOffsets(date).isEmpty())
            throw new IllegalArgumentException("This time does not exist because of the daylight-saving change.");
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteEvent(Long eventId) {
        EventModel event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        eventRepository.delete(event);
    }
}
