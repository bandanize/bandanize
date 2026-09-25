package com.bandanize.backend.services;

import com.bandanize.backend.models.TablatureModel;
import com.bandanize.backend.repositories.*;
import com.bandanize.backend.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@Service
@Transactional
public class TabEditService {
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final TablatureRepository tabs;
    private final UserRepository users;
    private final ResourceAccess access;
    public TabEditService(TablatureRepository tabs, UserRepository users, ResourceAccess access) {
        this.tabs = tabs; this.users = users; this.access = access;
    }
    public record State(boolean locked, String ownerName, Instant expiresAt, String token) {}
    private boolean active(TablatureModel tab) {
        return tab.getEditExpiresAt() != null && tab.getEditExpiresAt().isAfter(Instant.now());
    }
    private TablatureModel lockedTab(Long id) {
        var tab = tabs.findForEditing(id).orElseThrow(() -> new ResourceNotFoundException("Tab not found"));
        entityManager.refresh(tab, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        access.tab(id);
        return tab;
    }
    private boolean owns(TablatureModel tab, String token) {
        return token != null && token.equals(tab.getEditToken()) && access.currentUserId().equals(tab.getEditOwnerId());
    }
    public State status(Long id) {
        access.tab(id);
        var tab = tabs.findById(id).orElseThrow(() -> new ResourceNotFoundException("Tab not found"));
        return active(tab) ? new State(true, tab.getEditOwnerName(), tab.getEditExpiresAt(), null)
                : new State(false, null, null, null);
    }
    public State acquire(Long id, String content, String token) {
        var tab = lockedTab(id);
        if (token != null) {
            if (!active(tab) || !owns(tab, token))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Editing session expired. Keep a copy of your draft and reopen the editor.");
        } else {
            if (active(tab)) throw new ResponseStatusException(HttpStatus.CONFLICT, tab.getEditOwnerName() + " is editing this tablature.");
            if (!Objects.equals(Objects.toString(tab.getContent(), ""), content))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Tablature has changed. Refresh before editing.");
            var user = users.findById(access.currentUserId()).orElseThrow();
            tab.setEditOwnerId(user.getId());
            tab.setEditOwnerName(user.getName() == null ? user.getUsername() : user.getName());
            tab.setEditToken(UUID.randomUUID().toString());
        }
        tab.setEditExpiresAt(Instant.now().plusSeconds(90));
        return new State(true, tab.getEditOwnerName(), tab.getEditExpiresAt(), tab.getEditToken());
    }
    public void release(Long id, String token) {
        var tab = lockedTab(id);
        if (owns(tab, token)) {
            tab.setEditOwnerId(null); tab.setEditOwnerName(null); tab.setEditToken(null); tab.setEditExpiresAt(null);
        }
    }
    // Caller transaction must include the subsequent mutation, holding the DB row lock.
    public void requireWritable(Long id, String token, boolean contentChange) {
        var tab = lockedTab(id);
        if (contentChange ? !active(tab) || !owns(tab, token) : active(tab) && !owns(tab, token))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tablature is locked or the editing session has expired.");
    }
}
