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

    @org.springframework.transaction.annotation.Transactional
    public void deleteEvent(Long eventId) {
        EventModel event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        eventRepository.delete(event);
    }
}
