package com.bandanize.backend.services;

import com.bandanize.backend.dtos.BandDTO;
import com.bandanize.backend.dtos.BandInvitationDTO;
import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.BandInvitationRepository;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BandServiceTest {

    @Mock
    private BandRepository bandRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BandInvitationRepository invitationRepository;

    @Mock
    private SongService songService;

    @Mock
    private StorageService storageService;

    @Mock
    private EmailService emailService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private BandService bandService;

    private UserModel owner;
    private UserModel member;
    private BandModel band;

    @BeforeEach
    void setUp() {
        owner = new UserModel();
        owner.setId(1L);
        owner.setUsername("owner");
        owner.setName("Owner");
        owner.setEmail("owner@test.com");
        owner.setBands(new ArrayList<>());

        member = new UserModel();
        member.setId(2L);
        member.setUsername("member");
        member.setName("Member");
        member.setEmail("member@test.com");
        member.setBands(new ArrayList<>());

        band = new BandModel();
        band.setId(10L);
        band.setName("Test Band");
        band.setOwner(owner);
        band.setUsers(new ArrayList<>(List.of(owner)));
    }

    // ── getAllBands ──────────────────────────────────────────────────

    @Test
    void getAllBands_ReturnsAll() {
        when(bandRepository.findAll()).thenReturn(List.of(band));

        List<BandDTO> result = bandService.getAllBands();

        assertEquals(1, result.size());
        assertEquals("Test Band", result.get(0).getName());
    }

    // ── getBandById ─────────────────────────────────────────────────

    @Test
    void getBandById_Found_ReturnsBandDTO() {
        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));

        BandDTO result = bandService.getBandById(10L);

        assertEquals(10L, result.getId());
        assertEquals("Test Band", result.getName());
    }

    @Test
    void getBandById_NotFound_ThrowsException() {
        when(bandRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> bandService.getBandById(99L));
    }

    // ── createBandWithUser ──────────────────────────────────────────

    @Test
    void createBandWithUser_Success() {
        BandModel details = new BandModel();
        details.setName("New Band");
        details.setDescription("A test band");

        when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
        when(bandRepository.save(any(BandModel.class))).thenAnswer(inv -> {
            BandModel b = inv.getArgument(0);
            b.setId(20L);
            return b;
        });
        when(userRepository.save(any(UserModel.class))).thenReturn(owner);

        BandDTO result = bandService.createBandWithUser(1L, details);

        assertEquals("New Band", result.getName());
        assertEquals(1L, result.getOwnerId());
        verify(bandRepository).save(any(BandModel.class));
        verify(userRepository).save(owner);
    }

    @Test
    void createBandWithUser_UserNotFound_ThrowsException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> bandService.createBandWithUser(99L, new BandModel()));
    }

    // ── updateBand ──────────────────────────────────────────────────

    @Test
    void updateBand_Success() {
        BandModel details = new BandModel();
        details.setName("Updated Name");

        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(bandRepository.save(any(BandModel.class))).thenAnswer(inv -> inv.getArgument(0));

        BandDTO result = bandService.updateBand(10L, details);

        assertEquals("Updated Name", result.getName());
    }

    @Test
    void updateBand_NotFound_ThrowsException() {
        when(bandRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> bandService.updateBand(99L, new BandModel()));
    }

    // ── acceptInvitation ────────────────────────────────────────────

    @Test
    void acceptInvitation_Success() {
        BandInvitationModel invitation = new BandInvitationModel();
        invitation.setId(100L);
        invitation.setBand(band);
        invitation.setInvitedUser(member);
        invitation.setStatus(InvitationStatus.PENDING);

        when(invitationRepository.findById(100L)).thenReturn(Optional.of(invitation));

        bandService.acceptInvitation(100L);

        assertEquals(InvitationStatus.ACCEPTED, invitation.getStatus());
        assertTrue(band.getUsers().contains(member));
        verify(bandRepository).save(band);
        verify(invitationRepository).save(invitation);
        verify(notificationService).createMemberAddedNotification(band, member, null);
    }

    @Test
    void acceptInvitation_NotPending_ThrowsException() {
        BandInvitationModel invitation = new BandInvitationModel();
        invitation.setId(100L);
        invitation.setStatus(InvitationStatus.ACCEPTED); // Already accepted

        when(invitationRepository.findById(100L)).thenReturn(Optional.of(invitation));

        assertThrows(IllegalArgumentException.class,
                () -> bandService.acceptInvitation(100L));
    }

    @Test
    void acceptInvitation_NotFound_ThrowsException() {
        when(invitationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> bandService.acceptInvitation(99L));
    }

    // ── rejectInvitation ────────────────────────────────────────────

    @Test
    void rejectInvitation_Success() {
        BandInvitationModel invitation = new BandInvitationModel();
        invitation.setId(100L);
        invitation.setStatus(InvitationStatus.PENDING);

        when(invitationRepository.findById(100L)).thenReturn(Optional.of(invitation));

        bandService.rejectInvitation(100L);

        assertEquals(InvitationStatus.REJECTED, invitation.getStatus());
        verify(invitationRepository).save(invitation);
    }

    // ── leaveBand ───────────────────────────────────────────────────

    @Test
    void leaveBand_Success() {
        band.getUsers().add(member);
        member.getBands().add(band);

        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(2L)).thenReturn(Optional.of(member));

        bandService.leaveBand(10L, 2L);

        assertFalse(band.getUsers().contains(member));
        assertFalse(member.getBands().contains(band));
        verify(bandRepository).save(band);
        verify(userRepository).save(member);
    }

    @Test
    void leaveBand_NotMember_ThrowsException() {
        // member is NOT in band.getUsers()
        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(2L)).thenReturn(Optional.of(member));

        assertThrows(ResourceNotFoundException.class,
                () -> bandService.leaveBand(10L, 2L));
    }

    // ── removeMember ────────────────────────────────────────────────

    @Test
    void removeMember_OwnerRemovesMember_Success() {
        band.getUsers().add(member);
        member.getBands().add(band);

        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));
        when(userRepository.findById(2L)).thenReturn(Optional.of(member));

        bandService.removeMember(10L, 2L, 1L); // requesterId = owner

        assertFalse(band.getUsers().contains(member));
        verify(bandRepository).save(band);
    }

    @Test
    void removeMember_NonOwner_ThrowsAccessDenied() {
        band.getUsers().add(member);

        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));

        assertThrows(AccessDeniedException.class,
                () -> bandService.removeMember(10L, 2L, 2L)); // requester is member, not owner
    }

    @Test
    void removeMember_CannotRemoveOwner() {
        when(bandRepository.findById(10L)).thenReturn(Optional.of(band));

        assertThrows(IllegalArgumentException.class,
                () -> bandService.removeMember(10L, 1L, 1L)); // trying to remove owner
    }

    // ── getBandsByUsername ───────────────────────────────────────────

    @Test
    void getBandsByUsername_Success() {
        owner.getBands().add(band);
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(owner));

        List<BandDTO> result = bandService.getBandsByUsername("owner");

        assertEquals(1, result.size());
        assertEquals("Test Band", result.get(0).getName());
    }

    @Test
    void getBandsByUsername_UserNotFound_ThrowsException() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> bandService.getBandsByUsername("unknown"));
    }
}
