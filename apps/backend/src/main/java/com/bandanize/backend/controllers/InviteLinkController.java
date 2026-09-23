package com.bandanize.backend.controllers;

import com.bandanize.backend.services.InviteLinkService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class InviteLinkController {
    private final InviteLinkService links;
    public InviteLinkController(InviteLinkService links) { this.links = links; }

    @PostMapping("/bands/{bandId}/invite-link")
    public InviteLinkService.Link create(@PathVariable Long bandId, Authentication auth) {
        return links.create(bandId, auth.getName());
    }

    @DeleteMapping("/bands/{bandId}/invite-link")
    public ResponseEntity<Void> revoke(@PathVariable Long bandId, Authentication auth) {
        links.revoke(bandId, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/invite-links/{token}")
    public ResponseEntity<InviteLinkService.Preview> preview(@PathVariable String token) {
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .header("Referrer-Policy", "no-referrer").body(links.preview(token));
    }

    @PostMapping("/invite-links/{token}/accept")
    public InviteLinkService.Joined accept(@PathVariable String token, Authentication auth) {
        return links.accept(token, auth.getName());
    }
}
