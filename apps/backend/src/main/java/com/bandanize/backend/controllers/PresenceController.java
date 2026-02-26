package com.bandanize.backend.controllers;

import com.bandanize.backend.services.PresenceService;
import com.bandanize.backend.services.UserService;
import com.bandanize.backend.dtos.UserDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/presence")
public class PresenceController {

    @Autowired
    private PresenceService presenceService;

    @Autowired
    private UserService userService;

    @PostMapping("/{projectId}/heartbeat")
    public ResponseEntity<Map<String, Long>> heartbeat(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserDetails userDetails) {

        UserDTO user = userService.getUserByUsername(userDetails.getUsername());
        presenceService.heartbeat(projectId, user.getId().toString());

        long count = presenceService.getOnlineCount(projectId);
        return ResponseEntity.ok(Collections.singletonMap("onlineCount", count));
    }
}
