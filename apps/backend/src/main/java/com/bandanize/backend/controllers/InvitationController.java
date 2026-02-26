package com.bandanize.backend.controllers;

import com.bandanize.backend.dtos.BandInvitationDTO;
import com.bandanize.backend.dtos.UserDTO;
import com.bandanize.backend.services.BandService;
import com.bandanize.backend.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invitations")
public class InvitationController {

    private final BandService bandService;
    private final UserService userService;

    @Autowired
    public InvitationController(BandService bandService, UserService userService) {
        this.bandService = bandService;
        this.userService = userService;
    }

    @GetMapping("/mine")
    public ResponseEntity<List<BandInvitationDTO>> getMyInvitations(@AuthenticationPrincipal UserDetails userDetails) {
        UserDTO user = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(bandService.getPendingInvitations(user.getId()));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<String> acceptInvitation(@PathVariable Long id) {
        bandService.acceptInvitation(id);
        return ResponseEntity.ok("Invitation accepted");
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<String> rejectInvitation(@PathVariable Long id) {
        bandService.rejectInvitation(id);
        return ResponseEntity.ok("Invitation rejected");
    }
}
