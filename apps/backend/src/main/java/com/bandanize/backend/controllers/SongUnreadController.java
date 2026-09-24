package com.bandanize.backend.controllers;

import com.bandanize.backend.services.SongUnreadService;
import com.bandanize.backend.repositories.UserRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api")
public class SongUnreadController {
    private final SongUnreadService activity;
    private final UserRepository users;
    public SongUnreadController(SongUnreadService activity, UserRepository users) {
        this.activity = activity; this.users = users;
    }
    private Long userId(Principal principal) {
        if (principal == null) throw new AccessDeniedException("Sign in first");
        return users.findByUsername(principal.getName()).orElseThrow(() -> new AccessDeniedException("Sign in first")).getId();
    }
    @GetMapping("/bands/{bandId}/song-unread")
    public List<SongUnreadService.Unread> unread(@PathVariable Long bandId, Principal principal) {
        return activity.unread(bandId, userId(principal));
    }
    @PostMapping("/songs/{songId}/seen")
    public void seen(@PathVariable Long songId, @RequestBody Map<String, List<String>> observed, Principal principal) {
        activity.seen(songId, userId(principal), observed);
    }
}
