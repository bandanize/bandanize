package com.bandanize.backend.services;
import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.*;
import com.bandanize.backend.exceptions.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@Transactional(readOnly = true)
public class ResourceAccess {
    @Autowired UserRepository users;
    @Autowired BandRepository bands;
    @Autowired SongRepository songs;
    @Autowired SongListRepository lists;
    @Autowired TablatureRepository tabs;
    @Autowired EventRepository events;
    public Long currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new AccessDeniedException("Authentication required");
        return users.findByUsername(auth.getName()).orElseThrow(() -> new AccessDeniedException("Authentication required")).getId();
    }
    public void user(Long id) {
        if (!currentUserId().equals(id)) throw new AccessDeniedException("You can only modify your own account");
    }
    private void member(BandModel band) {
        Long id = currentUserId();
        if ((band.getOwner() == null || !id.equals(band.getOwner().getId()))
                && band.getUsers().stream().noneMatch(u -> id.equals(u.getId())))
            throw new AccessDeniedException("Project membership required");
    }
    public void band(Long id) { member(bands.findById(id).orElseThrow(() -> new ResourceNotFoundException("Project not found"))); }
    public void song(Long id) { member(songs.findById(id).orElseThrow(() -> new ResourceNotFoundException("Song not found")).getBand()); }
    public void list(Long id) { member(lists.findById(id).orElseThrow(() -> new ResourceNotFoundException("List not found")).getBand()); }
    public void tab(Long id) { member(tabs.findById(id).orElseThrow(() -> new ResourceNotFoundException("Tab not found")).getSong().getBand()); }
    public void event(Long id) { member(events.findById(id).orElseThrow(() -> new ResourceNotFoundException("Event not found")).getBand()); }
}
