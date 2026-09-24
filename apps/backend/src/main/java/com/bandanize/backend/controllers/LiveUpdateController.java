package com.bandanize.backend.controllers;
import com.bandanize.backend.services.LiveUpdateService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/live")
public class LiveUpdateController {
    private final LiveUpdateService live;
    public LiveUpdateController(LiveUpdateService live) { this.live = live; }
    @GetMapping(value="/events", produces="text/event-stream")
    public ResponseEntity<SseEmitter> events(Authentication authentication) {
        return ResponseEntity.ok().header("Cache-Control", "no-store")
            .header("X-Accel-Buffering", "no").body(live.subscribe(authentication.getName()));
    }
}
