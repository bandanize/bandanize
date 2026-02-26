package com.bandanize.backend.services;

import com.bandanize.backend.dtos.UserDTO;
import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.BandInvitationRepository;
import com.bandanize.backend.repositories.ChatMessageRepository;
import com.bandanize.backend.repositories.ChatReadStatusRepository;
import com.bandanize.backend.repositories.EventRepository;
import com.bandanize.backend.repositories.NotificationRepository;
import com.bandanize.backend.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service class for managing User-related operations.
 * Handles business logic for user creation, retrieval, updates, and deletion.
 */
@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final BandRepository bandRepository;
    private final BandInvitationRepository bandInvitationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatReadStatusRepository chatReadStatusRepository;
    private final EventRepository eventRepository;
    private final NotificationRepository notificationRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final JwtService jwtService;

    @Autowired
    public UserService(UserRepository userRepository,
            BandRepository bandRepository,
            BandInvitationRepository bandInvitationRepository,
            ChatMessageRepository chatMessageRepository,
            ChatReadStatusRepository chatReadStatusRepository,
            EventRepository eventRepository,
            NotificationRepository notificationRepository,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
            EmailService emailService,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.bandRepository = bandRepository;
        this.bandInvitationRepository = bandInvitationRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.chatReadStatusRepository = chatReadStatusRepository;
        this.eventRepository = eventRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.jwtService = jwtService;
    }

    /**
     * Retrieves all users.
     *
     * @return List of UserDTOs representing all users.
     */
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Creates a new user.
     *
     * @param user The user entity to save.
     * @return The created UserDTO.
     */
    public UserDTO createUser(UserModel user) {
        UserModel savedUser = userRepository.save(user);
        return convertToDTO(savedUser);
    }

    /**
     * Retrieves a user by their username.
     *
     * @param username The username to search for.
     * @return The found UserDTO.
     * @throws ResourceNotFoundException if the user is not found.
     */
    public UserDTO getUserByUsername(String username) {
        UserModel user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return convertToDTO(user);
    }

    /**
     * Retrieves a user by their ID.
     *
     * @param id The ID to search for.
     * @return The found UserDTO.
     * @throws ResourceNotFoundException if the user is not found.
     */
    public UserDTO getUserById(Long id) {
        UserModel user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return convertToDTO(user);
    }

    /**
     * Updates an existing user's details.
     *
     * @param id          The ID of the user to update.
     * @param userDetails The new user details.
     * @return The updated UserDTO.
     * @throws ResourceNotFoundException if the user is not found.
     */
    public UserDTO updateUser(Long id, UserModel userDetails) {
        UserModel user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        // Update only the fields provided in the request body
        if (userDetails.getName() != null)
            user.setName(userDetails.getName());
        if (userDetails.getEmail() != null)
            user.setEmail(userDetails.getEmail());
        if (userDetails.getUsername() != null)
            user.setUsername(userDetails.getUsername());
        if (userDetails.getCity() != null)
            user.setCity(userDetails.getCity());
        if (userDetails.getPhoto() != null)
            user.setPhoto(userDetails.getPhoto());
        if (userDetails.getRrss() != null && !userDetails.getRrss().isEmpty()) {
            user.setRrss(userDetails.getRrss());
        }

        UserModel updatedUser = userRepository.save(user);
        return convertToDTO(updatedUser);
    }

    /**
     * Deletes a user by their ID.
     * Removes the user from all associated bands before deletion.
     *
     * @param id The ID of the user to delete.
     * @throws ResourceNotFoundException if the user is not found.
     */
    @org.springframework.transaction.annotation.Transactional
    public void deleteUser(Long id) {
        UserModel user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        // 1. Delete all invitations for this user
        bandInvitationRepository.deleteByInvitedUser(user);

        // 2. Anonymize chat messages sent by this user
        List<com.bandanize.backend.models.ChatMessageModel> messages = chatMessageRepository.findBySender(user);
        for (com.bandanize.backend.models.ChatMessageModel msg : messages) {
            msg.setSender(null);
        }
        chatMessageRepository.saveAll(messages);

        // 3. Delete chat read statuses for this user
        chatReadStatusRepository.deleteByUserId(user.getId());

        // 4. Delete notifications where user is recipient or actor
        notificationRepository.deleteByRecipient(user);
        notificationRepository.deleteByActor(user);

        // 5. Delete events created by this user
        eventRepository.deleteByCreatorId(user.getId());

        // 6. Handle Bands
        // We need to separate bands owned by the user vs bands the user is just a
        // member of.
        // Note: user.getBands() returns ALL bands the user is part of (owned + member).

        List<BandModel> allBands = new java.util.ArrayList<>(user.getBands());

        for (BandModel band : allBands) {
            if (band.getOwner() != null && band.getOwner().getId().equals(user.getId())) {
                // User is the owner -> Delete the band
                bandRepository.delete(band);
            } else {
                // User is just a member -> Remove from band
                band.getUsers().remove(user);
                bandRepository.save(band);
            }
        }

        // 7. Delete the user
        userRepository.delete(user);
    }

    /**
     * Searches for users by email or username containing the query string.
     *
     * @param query The search query.
     * @return List of matching UserDTOs.
     */
    public List<UserDTO> searchUsers(String query) {
        return userRepository.searchUsers(query).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Changes the password of a user.
     *
     * @param userId          The ID of the user.
     * @param currentPassword The current password for validation.
     * @param newPassword     The new password to set.
     * @throws ResourceNotFoundException                                           if
     *                                                                             the
     *                                                                             user
     *                                                                             is
     *                                                                             not
     *                                                                             found.
     * @throws org.springframework.security.authentication.BadCredentialsException if
     *                                                                             the
     *                                                                             current
     *                                                                             password
     *                                                                             is
     *                                                                             incorrect.
     */
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        UserModel user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (!passwordEncoder.matches(currentPassword, user.getHashedPassword())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid current password");
        }

        user.setHashedPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

    }

    public void processForgotPassword(String email) {
        UserModel user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        String token = jwtService.generateResetToken(user.getUsername());
        emailService.sendPasswordReset(user.getEmail(), token);
    }

    public void resetPassword(String token, String newPassword) {
        String username = jwtService.extractUsername(token); // Throws if invalid/expired
        UserModel user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setHashedPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @org.springframework.transaction.annotation.Transactional
    public void verifyUser(String token) {
        String username = jwtService.extractUsername(token); // Throws if invalid/expired
        logger.debug("Verifying user: {}", username);
        UserModel user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        logger.debug("User found. Current disabled status: {}", user.isDisabled());

        if (!user.isDisabled()) {
            logger.debug("User already verified: {}", username);
            return;
        }

        user.setDisabled(false);
        userRepository.save(user);
        logger.debug("User enabled and saved: {}", username);
    }

    public void sendVerificationEmail(UserModel user, String token) {
        emailService.sendVerificationEmail(user.getEmail(), token);
    }

    /**
     * Converts a UserModel entity to a UserDTO.
     *
     * @param user The UserModel entity.
     * @return The corresponding UserDTO.
     */
    private UserDTO convertToDTO(UserModel user) {
        UserDTO userDTO = new UserDTO();
        userDTO.setId(user.getId());
        userDTO.setUsername(user.getUsername());
        userDTO.setEmail(user.getEmail());
        userDTO.setName(user.getName());
        userDTO.setCity(user.getCity());
        userDTO.setRrss(user.getRrss());
        userDTO.setPhoto(user.getPhoto());
        userDTO.setBandIds(user.getBands().stream()
                .map(BandModel::getId)
                .collect(Collectors.toList()));
        return userDTO;
    }
}
