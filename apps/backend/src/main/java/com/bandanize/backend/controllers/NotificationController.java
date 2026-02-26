package com.bandanize.backend.controllers;

import com.bandanize.backend.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private com.bandanize.backend.services.UserService userService;

    @GetMapping
    public List<com.bandanize.backend.dtos.NotificationDTO> getNotifications(@PathVariable Long projectId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        com.bandanize.backend.dtos.UserDTO user = userService.getUserByUsername(userDetails.getUsername());
        return notificationService.getProjectNotifications(projectId, user.getId());
    }

    @GetMapping("/unread-count")
    public long getUnreadCount(@PathVariable Long projectId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        com.bandanize.backend.dtos.UserDTO user = userService.getUserByUsername(userDetails.getUsername());
        return notificationService.getUnreadCount(projectId, user.getId());
    }

    @PostMapping("/mark-read")
    public ResponseEntity<Void> markAllAsRead(@PathVariable Long projectId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        com.bandanize.backend.dtos.UserDTO user = userService.getUserByUsername(userDetails.getUsername());
        notificationService.markAllAsRead(projectId, user.getId());
        return ResponseEntity.ok().build();
    }
}
