package com.bandanize.backend.controllers;
import com.bandanize.backend.services.TabEditService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/tabs/{tabId}/edit-lock")
public class TabEditController {
    private final TabEditService edits;
    public TabEditController(TabEditService edits) { this.edits = edits; }
    public record Request(String content, String token) {}
    @GetMapping public ResponseEntity<TabEditService.State> status(@PathVariable Long tabId) {
        return ResponseEntity.ok().cacheControl(org.springframework.http.CacheControl.noStore()).body(edits.status(tabId));
    }
    @PostMapping public TabEditService.State acquire(@PathVariable Long tabId, @RequestBody Request request) {
        return edits.acquire(tabId, request.content(), request.token());
    }
    @DeleteMapping public void release(@PathVariable Long tabId, @RequestHeader("X-Tab-Edit-Token") String token) {
        edits.release(tabId, token);
    }
}
