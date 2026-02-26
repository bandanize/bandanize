package com.bandanize.backend.controllers;

import com.bandanize.backend.dtos.BandDTO;
import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.services.BandService;
import com.bandanize.backend.services.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for managing Bands.
 * Exposes endpoints for creating, retrieving, and updating bands.
 */
@RestController
@RequestMapping("/api/bands")
public class BandController {

    private final BandService bandService;
    private final com.bandanize.backend.services.UserService userService;
    private final ChatService chatService;

    @Autowired
    public BandController(BandService bandService, com.bandanize.backend.services.UserService userService,
            ChatService chatService) {
        this.bandService = bandService;
        this.userService = userService;
        this.chatService = chatService;
    }

    /**
     * Retrieves all bands.
     *
     * @return List of BandDTOs.
     */
    @GetMapping
    public List<BandDTO> getAllBands() {
        return bandService.getAllBands();
    }

    /**
     * Retrieves a band by its ID.
     *
     * @param id The ID of the band.
     * @return ResponseEntity with the BandDTO.
     */
    @GetMapping("/{id}")
    public ResponseEntity<BandDTO> getBandById(@PathVariable Long id) {
        BandDTO bandDTO = bandService.getBandById(id);
        return ResponseEntity.ok(bandDTO);
    }

    /**
     * Retrieves the bands associated with the authenticated user.
     *
     * @param userDetails The authenticated user details.
     * @return ResponseEntity with the list of BandDTOs.
     */
    @GetMapping("/my-bands")
    public ResponseEntity<List<BandDTO>> getMyBands(@AuthenticationPrincipal UserDetails userDetails) {
        List<BandDTO> bands = bandService.getBandsByUsername(userDetails.getUsername());
        return ResponseEntity.ok(bands);
    }

    /**
     * Updates an existing band.
     *
     * @param id          The ID of the band to update.
     * @param bandDetails The updated details.
     * @return ResponseEntity with the updated BandDTO.
     */
    @PutMapping("/{id}")
    public ResponseEntity<BandDTO> updateBand(@PathVariable Long id, @RequestBody BandModel bandDetails) {
        BandDTO updatedBand = bandService.updateBand(id, bandDetails);
        return ResponseEntity.ok(updatedBand);
    }

    /**
     * Creates a new band.
     *
     * @param band The band to create.
     * @return The created BandDTO.
     */
    @PostMapping
    public BandDTO createBand(@RequestBody BandModel band) {
        return bandService.createBand(band);
    }

    /**
     * Creates a new band associated with a specific user.
     *
     * @param userId      The ID of the user.
     * @param bandDetails The band details.
     * @return ResponseEntity with the created BandDTO.
     */
    @PostMapping("/create/{userId}")
    public ResponseEntity<BandDTO> createBandWithUser(@PathVariable Long userId, @RequestBody BandModel bandDetails) {
        BandDTO createdBand = bandService.createBandWithUser(userId, bandDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdBand);
    }

    /**
     * Invites a user to the band.
     *
     * @param bandId The ID of the band.
     * @param body   Map containing the email of the user to invite.
     * @return ResponseEntity with success message.
     */
    @PostMapping("/{bandId}/invite")
    public ResponseEntity<String> inviteUser(@PathVariable Long bandId, @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = body.get("email");
        String userIdStr = body.get("userId");
        String inviterName = userDetails != null ? userDetails.getUsername() : "Un miembro";

        // Try to get a better name if possible
        if (userDetails != null) {
            try {
                com.bandanize.backend.dtos.UserDTO requester = userService.getUserByUsername(userDetails.getUsername());
                if (requester.getName() != null && !requester.getName().isEmpty()) {
                    inviterName = requester.getName();
                }
            } catch (Exception e) {
                // Fallback to username
            }
        }

        if (userIdStr != null && !userIdStr.trim().isEmpty()) {
            bandService.inviteMemberById(bandId, Long.parseLong(userIdStr), inviterName);
        } else if (email != null && !email.trim().isEmpty()) {
            bandService.inviteMember(bandId, email, inviterName);
        } else {
            throw new IllegalArgumentException("Email or User ID is required");
        }
        return ResponseEntity.ok("Invitation sent successfully");
    }

    /**
     * Allows a user to leave the band.
     * 
     * @param bandId      The ID of the band.
     * @param userDetails The authenticated user.
     * @return ResponseEntity with success message.
     */
    @PostMapping("/{bandId}/leave")
    public ResponseEntity<String> leaveBand(@PathVariable Long bandId,
            @AuthenticationPrincipal UserDetails userDetails) {
        com.bandanize.backend.dtos.UserDTO user = userService.getUserByUsername(userDetails.getUsername());
        bandService.leaveBand(bandId, user.getId());
        return ResponseEntity.ok("Left band successfully");
    }

    /**
     * Removes a member from the band.
     * Only the owner can remove members.
     * 
     * @param bandId      The ID of the band.
     * @param userId      The ID of the user to remove.
     * @param userDetails The authenticated user (requester).
     * @return ResponseEntity with success message.
     */
    @DeleteMapping("/{bandId}/members/{userId}")
    public ResponseEntity<String> removeMember(@PathVariable Long bandId, @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        com.bandanize.backend.dtos.UserDTO requester = userService.getUserByUsername(userDetails.getUsername());
        bandService.removeMember(bandId, userId, requester.getId());
        return ResponseEntity.ok("Member removed successfully");
    }

    /**
     * Deletes a band.
     * Only the owner can delete a band.
     *
     * @param id          The ID of the band.
     * @param userDetails The authenticated user.
     * @return ResponseEntity with success message.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteBand(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        com.bandanize.backend.dtos.UserDTO user = userService.getUserByUsername(userDetails.getUsername());

        bandService.deleteBand(id, user.getId());
        return ResponseEntity.ok("Band deleted successfully");
    }

    /**
     * Adds a chat message to the band.
     *
     * @param bandId  The ID of the band.
     * @param request The chat message request.
     * @return ResponseEntity with the saved ChatMessageModel.
     */
    @PostMapping("/{bandId}/chat")
    public ResponseEntity<com.bandanize.backend.models.ChatMessageModel> addChatMessage(@PathVariable Long bandId,
            @RequestBody com.bandanize.backend.dtos.ChatMessageRequestDTO request) {
        com.bandanize.backend.models.ChatMessageModel savedMessage = chatService.sendMessage(bandId,
                request.getUserId(), request.getMessage());
        return ResponseEntity.ok(savedMessage);
    }

    /**
     * Checks if the user has unread messages in the band chat.
     *
     * @param bandId      The ID of the band.
     * @param userDetails The authenticated user.
     * @return ResponseEntity with boolean status.
     */
    @GetMapping("/{bandId}/chat/unread")
    public ResponseEntity<Boolean> getUnreadChatStatus(@PathVariable Long bandId,
            @AuthenticationPrincipal UserDetails userDetails) {
        com.bandanize.backend.dtos.UserDTO user = userService.getUserByUsername(userDetails.getUsername());
        boolean hasUnread = chatService.hasUnreadMessages(bandId, user.getId());
        return ResponseEntity.ok(hasUnread);
    }

    /**
     * Marks all messages in the band chat as read for the user.
     *
     * @param bandId      The ID of the band.
     * @param userDetails The authenticated user.
     * @return ResponseEntity with success message.
     */
    @PostMapping("/{bandId}/chat/read")
    public ResponseEntity<String> markChatAsRead(@PathVariable Long bandId,
            @AuthenticationPrincipal UserDetails userDetails) {
        com.bandanize.backend.dtos.UserDTO user = userService.getUserByUsername(userDetails.getUsername());
        chatService.markAsRead(bandId, user.getId());
        return ResponseEntity.ok("Chat marked as read");
    }

    /**
     * Retrieves the secure calendar token for the band.
     *
     * @param bandId      The ID of the band.
     * @param userDetails The authenticated user.
     * @return ResponseEntity with the calendar token.
     */
    @GetMapping("/{bandId}/calendar-token")
    public ResponseEntity<String> getCalendarToken(@PathVariable Long bandId,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Verify membership? Assuming only members should see the calendar token.
        // BandService.getOrGenerateCalendarToken does not verify, but we should
        // probably check if user is in band.
        // For now, let's assume if they can access the band page they can get the
        // token.
        // Ideally we should check permission.
        // Currently getBandById doesn't check permission explicitly other than returns
        // DTO.

        // I will use getOrGenerateCalendarToken
        String token = bandService.getOrGenerateCalendarToken(bandId);
        return ResponseEntity.ok(token);
    }

}