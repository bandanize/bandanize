package com.bandanize.backend.services;

import com.bandanize.backend.dtos.BandDTO;
import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class for managing Band-related operations.
 * Handles creation, retrieval, updates, and association of bands with users.
 */
@Service
public class BandService {

    private static final Logger logger = LoggerFactory.getLogger(BandService.class);

    private final BandRepository bandRepository;
    private final UserRepository userRepository;
    private final com.bandanize.backend.repositories.BandInvitationRepository invitationRepository;
    private final SongService songService;
    private final StorageService storageService;
    private final EmailService emailService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    public BandService(BandRepository bandRepository, UserRepository userRepository,
            com.bandanize.backend.repositories.BandInvitationRepository invitationRepository,
            SongService songService, StorageService storageService, EmailService emailService,
            NotificationService notificationService) {
        this.bandRepository = bandRepository;
        this.userRepository = userRepository;
        this.invitationRepository = invitationRepository;
        this.songService = songService;
        this.storageService = storageService;
        this.emailService = emailService;
        this.notificationService = notificationService;
    }

    // ... (rest of methods)

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<BandDTO> getAllBands() {
        return bandRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // ... existing getBandById ...
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public BandDTO getBandById(Long id) {
        BandModel band = bandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found with id: " + id));
        return convertToDTO(band);
    }

    // ... existing createBand ...
    @org.springframework.transaction.annotation.Transactional
    public BandDTO createBand(BandModel band) {
        if (band.getCalendarToken() == null) {
            band.setCalendarToken(UUID.randomUUID().toString());
        }
        BandModel savedBand = bandRepository.save(band);
        return convertToDTO(savedBand);
    }

    // ... existing createBandWithUser ...
    @org.springframework.transaction.annotation.Transactional
    public BandDTO createBandWithUser(Long userId, BandModel bandDetails) {
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        BandModel band = new BandModel();
        band.setName(bandDetails.getName());
        band.setPhoto(bandDetails.getPhoto());
        band.setDescription(bandDetails.getDescription());
        band.setGenre(bandDetails.getGenre());
        band.setCity(bandDetails.getCity());
        band.setRrss(bandDetails.getRrss());
        band.setOwner(user);
        band.getUsers().add(user);
        band.setCalendarToken(UUID.randomUUID().toString());

        BandModel savedBand = bandRepository.save(band);
        user.getBands().add(savedBand);
        userRepository.save(user);

        return convertToDTO(savedBand);
    }

    // ... existing updateBand ...
    @org.springframework.transaction.annotation.Transactional
    public BandDTO updateBand(Long id, BandModel bandDetails) {
        BandModel band = bandRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found with id: " + id));

        if (bandDetails.getName() != null)
            band.setName(bandDetails.getName());
        if (bandDetails.getPhoto() != null)
            band.setPhoto(bandDetails.getPhoto());
        if (bandDetails.getDescription() != null)
            band.setDescription(bandDetails.getDescription());
        if (bandDetails.getGenre() != null)
            band.setGenre(bandDetails.getGenre());
        if (bandDetails.getCity() != null)
            band.setCity(bandDetails.getCity());
        if (bandDetails.getRrss() != null && !bandDetails.getRrss().isEmpty()) {
            band.setRrss(bandDetails.getRrss());
        }

        BandModel updatedBand = bandRepository.save(band);
        return convertToDTO(updatedBand);
    }

    // ... existing getBandsByUsername ...
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<BandDTO> getBandsByUsername(String username) {
        UserModel user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        return user.getBands().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Sends an invitation to a user to join a band.
     * Replaces immediate adding.
     *
     * @param bandId The ID of the band.
     * @param email  The email of the user to invite.
     */
    @org.springframework.transaction.annotation.Transactional
    public void inviteMember(Long bandId, String email, String inviterName) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found with id: " + bandId));

        UserModel user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        executeInvitation(band, user, inviterName);
    }

    @org.springframework.transaction.annotation.Transactional
    public void inviteMemberById(Long bandId, Long userId, String inviterName) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found with id: " + bandId));

        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        executeInvitation(band, user, inviterName);
    }

    private void executeInvitation(BandModel band, UserModel user, String inviterName) {
        Long bandId = band.getId();

        if (band.getUsers().contains(user)) {
            throw new IllegalArgumentException("User is already a member");
        }

        // Check if invitation already exists
        java.util.Optional<com.bandanize.backend.models.BandInvitationModel> existingInvitation = invitationRepository
                .findByBandIdAndInvitedUserId(bandId, user.getId());

        if (existingInvitation.isPresent()) {
            com.bandanize.backend.models.BandInvitationModel invitation = existingInvitation.get();
            if (invitation.getStatus() == com.bandanize.backend.models.InvitationStatus.PENDING) {
                return;
            } else {
                // Reactivate invitation
                invitation.setStatus(com.bandanize.backend.models.InvitationStatus.PENDING);
                invitationRepository.save(invitation);
                return;
            }
        }

        com.bandanize.backend.models.BandInvitationModel invitation = new com.bandanize.backend.models.BandInvitationModel();
        invitation.setBand(band);
        invitation.setInvitedUser(user);
        invitation.setStatus(com.bandanize.backend.models.InvitationStatus.PENDING);

        invitationRepository.save(invitation);

        // Send email notification
        emailService.sendBandInvitation(user.getEmail(), band.getName(), inviterName, "view-invitations");
    }

    public List<com.bandanize.backend.dtos.BandInvitationDTO> getPendingInvitations(Long userId) {
        return invitationRepository
                .findByInvitedUserIdAndStatus(userId, com.bandanize.backend.models.InvitationStatus.PENDING).stream()
                .map(inv -> {
                    com.bandanize.backend.dtos.BandInvitationDTO dto = new com.bandanize.backend.dtos.BandInvitationDTO();
                    dto.setId(inv.getId());
                    dto.setBandName(inv.getBand().getName());
                    dto.setBandId(inv.getBand().getId());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional
    public void acceptInvitation(Long invitationId) {
        com.bandanize.backend.models.BandInvitationModel invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (invitation.getStatus() != com.bandanize.backend.models.InvitationStatus.PENDING) {
            throw new IllegalArgumentException("Invitation is not pending");
        }

        BandModel band = invitation.getBand();
        UserModel user = invitation.getInvitedUser();

        band.getUsers().add(user);
        // Ensure bidirectional consistency if mappedBy is used, though users is owner
        // here
        // But safe to be explicit if session is open
        if (!user.getBands().contains(band)) {
            user.getBands().add(band);
        }

        bandRepository.save(band); // Cascades to user if set up, ensuring consistent relationship

        invitation.setStatus(com.bandanize.backend.models.InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);

        // Notify
        notificationService.createMemberAddedNotification(band, user, null);
    }

    @org.springframework.transaction.annotation.Transactional
    public void rejectInvitation(Long invitationId) {
        com.bandanize.backend.models.BandInvitationModel invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        invitation.setStatus(com.bandanize.backend.models.InvitationStatus.REJECTED);
        invitationRepository.save(invitation);
    }

    @org.springframework.transaction.annotation.Transactional
    public void leaveBand(Long bandId, Long userId) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found"));
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!band.getUsers().contains(user)) {
            throw new ResourceNotFoundException("User is not in this band");
        }

        // Remove relationship
        band.getUsers().remove(user);
        user.getBands().remove(band); // Important for consistency

        bandRepository.save(band);
        userRepository.save(user);
    }

    @org.springframework.transaction.annotation.Transactional
    public void removeMember(Long bandId, Long memberId, Long requesterId) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found"));

        // Determine effective owner
        Long ownerId = null;
        if (band.getOwner() != null) {
            ownerId = band.getOwner().getId();
        } else if (!band.getUsers().isEmpty()) {
            // Fallback for legacy data: first user is owner
            ownerId = band.getUsers().get(0).getId();
        }

        // Verify requester is owner
        if (ownerId == null || !ownerId.equals(requesterId)) {
            throw new org.springframework.security.access.AccessDeniedException("Only the owner can remove members");
        }

        // Verify we are not removing the owner
        if (ownerId.equals(memberId)) {
            throw new IllegalArgumentException("Cannot remove the owner from the band");
        }

        UserModel member = userRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!band.getUsers().contains(member)) {
            throw new ResourceNotFoundException("User is not in this band");
        }

        // Remove relationship
        band.getUsers().remove(member);
        member.getBands().remove(band);

        bandRepository.save(band);
        userRepository.save(member);
    }

    // Method addChatMessage was moved to ChatService and BandController to handle
    // mentions correctly

    @org.springframework.transaction.annotation.Transactional
    public void deleteBand(Long bandId, Long requesterUserId) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found with id: " + bandId));

        if (band.getOwner() == null || !band.getOwner().getId().equals(requesterUserId)) {
            // Only the owner can delete
            if (band.getOwner() != null) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Only the owner can delete the band");
            }
        }

        // Delete photo if exists
        if (band.getPhoto() != null && !band.getPhoto().isEmpty()) {
            // Helper method for cleaning up URL like in SongService?
            // Let's copy the logic or expose it?
            // Simpler: duplicate the small logic or assumes it's managed.
            // Given I injected StorageService, I can call deleteFile.
            try {
                String photoUrl = band.getPhoto();
                if (photoUrl.contains("/uploads/")) {
                    String[] parts = photoUrl.split("/");
                    if (parts.length >= 2) {
                        String filename = parts[parts.length - 1];
                        String folder = parts[parts.length - 2];
                        storageService.deleteFile(filename, folder);
                    }
                }
            } catch (Exception e) {
                logger.warn("Failed to delete band photo: {}", e.getMessage());
            }
        }

        // Clear song lists explicitly to trigger file cleanup
        List<Long> listIds = band.getSongLists().stream().map(com.bandanize.backend.models.SongListModel::getId)
                .collect(Collectors.toList());
        for (Long listId : listIds) {
            songService.deleteSongList(listId);
        }
        band.getSongLists().clear();

        // Clear user associations and flush to ensure join table is clean
        band.getUsers().clear();
        bandRepository.saveAndFlush(band);

        // Delete the band - dependencies will be handled by CascadeType.ALL in
        // BandModel
        bandRepository.delete(band);
    }

    // ... existing convertToDTO ...
    private BandDTO convertToDTO(BandModel band) {
        BandDTO bandDTO = new BandDTO();
        bandDTO.setId(band.getId());
        bandDTO.setName(band.getName());
        bandDTO.setPhoto(band.getPhoto());
        bandDTO.setDescription(band.getDescription());
        bandDTO.setGenre(band.getGenre());
        bandDTO.setCity(band.getCity());

        // Map ownerId, fallback to first user if null (for legacy data)
        if (band.getOwner() != null) {
            bandDTO.setOwnerId(band.getOwner().getId());
        } else if (!band.getUsers().isEmpty()) {
            bandDTO.setOwnerId(band.getUsers().get(0).getId());
        }

        bandDTO.setRrss(band.getRrss());
        bandDTO.setMembers(band.getUsers().stream()
                .map(user -> new com.bandanize.backend.dtos.UserSummaryDTO(
                        user.getId(),
                        user.getUsername(),
                        user.getName(),
                        user.getEmail(),
                        user.getPhoto()))
                .collect(Collectors.toList()));
        bandDTO.setSongLists(band.getSongLists());
        bandDTO.setChatMessages(band.getChatMessages());
        return bandDTO;
    }

    @org.springframework.transaction.annotation.Transactional
    public String getOrGenerateCalendarToken(Long bandId) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found with id: " + bandId));

        if (band.getCalendarToken() == null || band.getCalendarToken().isEmpty()) {
            band.setCalendarToken(UUID.randomUUID().toString());
            bandRepository.save(band);
        }
        return band.getCalendarToken();
    }

    @org.springframework.transaction.annotation.Transactional
    public String refreshCalendarToken(Long bandId) {
        BandModel band = bandRepository.findById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found with id: " + bandId));

        band.setCalendarToken(UUID.randomUUID().toString());
        bandRepository.save(band);
        return band.getCalendarToken();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public BandModel getBandByCalendarToken(String token) {
        return bandRepository.findByCalendarToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Band not found for the given calendar token"));
    }
}
