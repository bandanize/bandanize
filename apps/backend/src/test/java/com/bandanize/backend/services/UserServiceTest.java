package com.bandanize.backend.services;

import com.bandanize.backend.dtos.UserDTO;
import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.models.ChatMessageModel;
import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BandRepository bandRepository;

    @Mock
    private BandInvitationRepository bandInvitationRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private ChatReadStatusRepository chatReadStatusRepository;

    @Mock
    private EventRepository eventRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailService emailService;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private UserService userService;

    private UserModel user;

    @BeforeEach
    void setUp() {
        user = new UserModel();
        user.setId(1L);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setName("Test User");
        user.setBands(new ArrayList<>());
    }

    // ── createUser ──────────────────────────────────────────────────

    @Test
    void createUser_ReturnsUserDTO() {
        when(userRepository.save(any(UserModel.class))).thenReturn(user);

        UserDTO result = userService.createUser(user);

        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
        assertEquals("test@example.com", result.getEmail());
        verify(userRepository).save(any(UserModel.class));
    }

    // ── getUserByUsername ────────────────────────────────────────────

    @Test
    void getUserByUsername_Found_ReturnsUserDTO() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));

        UserDTO result = userService.getUserByUsername("testuser");

        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
    }

    @Test
    void getUserByUsername_NotFound_ThrowsException() {
        when(userRepository.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> userService.getUserByUsername("unknown"));
    }

    // ── getUserById ─────────────────────────────────────────────────

    @Test
    void getUserById_Found_ReturnsUserDTO() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserDTO result = userService.getUserById(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
    }

    @Test
    void getUserById_NotFound_ThrowsException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> userService.getUserById(99L));
    }

    // ── getAllUsers ──────────────────────────────────────────────────

    @Test
    void getAllUsers_ReturnsAll() {
        UserModel user2 = new UserModel();
        user2.setId(2L);
        user2.setUsername("user2");
        user2.setEmail("u2@example.com");
        user2.setName("User Two");
        user2.setBands(new ArrayList<>());

        when(userRepository.findAll()).thenReturn(List.of(user, user2));

        List<UserDTO> result = userService.getAllUsers();

        assertEquals(2, result.size());
        assertEquals("testuser", result.get(0).getUsername());
        assertEquals("user2", result.get(1).getUsername());
    }

    // ── updateUser ──────────────────────────────────────────────────

    @Test
    void updateUser_Success_ReturnsUpdatedDTO() {
        UserModel details = new UserModel();
        details.setName("Updated Name");
        details.setCity("Madrid");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserModel.class))).thenAnswer(inv -> inv.getArgument(0));

        UserDTO result = userService.updateUser(1L, details);

        assertEquals("Updated Name", result.getName());
        assertEquals("Madrid", result.getCity());
        // Username should remain unchanged since it was not set in details
        assertEquals("testuser", result.getUsername());
    }

    @Test
    void updateUser_PartialUpdate_OnlySetsProvidedFields() {
        UserModel details = new UserModel();
        details.setEmail("new@example.com");
        // name, city, etc. stay null — should not overwrite existing values

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserModel.class))).thenAnswer(inv -> inv.getArgument(0));

        UserDTO result = userService.updateUser(1L, details);

        assertEquals("new@example.com", result.getEmail());
        assertEquals("Test User", result.getName()); // unchanged
    }

    @Test
    void updateUser_NotFound_ThrowsException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> userService.updateUser(99L, new UserModel()));
    }

    // ── deleteUser ──────────────────────────────────────────────────

    @Test
    void deleteUser_Success_CleansUpAllRelations() {
        // Setup: user owns one band and is a member of another
        BandModel ownedBand = new BandModel();
        ownedBand.setId(10L);
        ownedBand.setOwner(user);

        UserModel otherOwner = new UserModel();
        otherOwner.setId(2L);
        BandModel memberBand = new BandModel();
        memberBand.setId(20L);
        memberBand.setOwner(otherOwner);
        memberBand.setUsers(new ArrayList<>(List.of(otherOwner, user)));

        user.setBands(new ArrayList<>(List.of(ownedBand, memberBand)));

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(chatMessageRepository.findBySender(user)).thenReturn(new ArrayList<>());

        userService.deleteUser(1L);

        // Verify cleanup order
        verify(bandInvitationRepository).deleteByInvitedUser(user);
        verify(chatMessageRepository).findBySender(user);
        verify(chatReadStatusRepository).deleteByUserId(1L);
        verify(notificationRepository).deleteByRecipient(user);
        verify(notificationRepository).deleteByActor(user);
        verify(eventRepository).deleteByCreatorId(1L);
        verify(bandRepository).delete(ownedBand); // owned band deleted
        verify(bandRepository).save(memberBand); // member band saved after removal
        verify(userRepository).delete(user);

        // User should have been removed from memberBand's user list
        assertFalse(memberBand.getUsers().contains(user));
    }

    @Test
    void deleteUser_AnonymizesChatMessages() {
        ChatMessageModel msg1 = new ChatMessageModel();
        msg1.setSender(user);
        ChatMessageModel msg2 = new ChatMessageModel();
        msg2.setSender(user);

        user.setBands(new ArrayList<>());
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(chatMessageRepository.findBySender(user)).thenReturn(List.of(msg1, msg2));

        userService.deleteUser(1L);

        assertNull(msg1.getSender());
        assertNull(msg2.getSender());
        verify(chatMessageRepository).saveAll(List.of(msg1, msg2));
    }

    @Test
    void deleteUser_NotFound_ThrowsException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> userService.deleteUser(99L));
    }

    // ── changePassword ──────────────────────────────────────────────

    @Test
    void changePassword_Success() {
        user.setHashedPassword("encoded_old");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldpass", "encoded_old")).thenReturn(true);
        when(passwordEncoder.encode("newpass")).thenReturn("encoded_new");

        userService.changePassword(1L, "oldpass", "newpass");

        assertEquals("encoded_new", user.getHashedPassword());
        verify(userRepository).save(user);
    }

    @Test
    void changePassword_WrongCurrent_ThrowsException() {
        user.setHashedPassword("encoded_old");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "encoded_old")).thenReturn(false);

        assertThrows(BadCredentialsException.class,
                () -> userService.changePassword(1L, "wrong", "newpass"));

        verify(userRepository, never()).save(any());
    }

    // ── searchUsers ─────────────────────────────────────────────────

    @Test
    void searchUsers_ReturnsMatchingResults() {
        when(userRepository.searchUsers("test")).thenReturn(List.of(user));

        List<UserDTO> results = userService.searchUsers("test");

        assertEquals(1, results.size());
        assertEquals("testuser", results.get(0).getUsername());
    }

    @Test
    void searchUsers_NoResults_ReturnsEmptyList() {
        when(userRepository.searchUsers("xyz")).thenReturn(List.of());

        List<UserDTO> results = userService.searchUsers("xyz");

        assertTrue(results.isEmpty());
    }
}
