package com.bandanize.backend.controllers;

import com.bandanize.backend.dtos.UserDTO;
import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.services.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing Users.
 * Exposes endpoints to CRUD users.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Retrieves all users.
     *
     * @return List of UserDTOs.
     */
    /**
     * Retrieves all users.
     *
     * @return List of UserDTOs.
     */
    @GetMapping
    public List<UserDTO> getAllUsers() {
        return userService.getAllUsers();
    }

    /**
     * Searching users by email or username.
     * 
     * @param query The search string.
     * @return List of matching UserDTOs.
     */
    @GetMapping("/search")
    public List<UserDTO> searchUsers(@RequestParam String query) {
        return userService.searchUsers(query);
    }

    /**
     * Creates a new user.
     *
     * @param user The user details.
     * @return The created UserDTO.
     */
    @PostMapping
    public UserDTO createUser(@RequestBody UserModel user) {
        return userService.createUser(user);
    }

    /**
     * Retrieves the details of the currently authenticated user.
     *
     * @param userDetails The authenticated user details.
     * @return The UserDTO of the current user.
     */
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        UserDTO userDTO = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(userDTO);
    }

    /**
     * Retrieves a user by their ID.
     *
     * @param id The ID of the user.
     * @return ResponseEntity containing the UserDTO.
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        UserDTO userDTO = userService.getUserById(id);
        return ResponseEntity.ok(userDTO);
    }

    /**
     * Updates an existing user.
     *
     * @param id          The ID of the user to update.
     * @param userDetails The updated details.
     * @return The updated UserDTO.
     */
    @PutMapping("/{id}")
    public UserDTO updateUser(@PathVariable Long id, @RequestBody UserModel userDetails) {
        return userService.updateUser(id, userDetails);
    }

    /**
     * Deletes a user by their ID.
     *
     * @param id The ID of the user to delete.
     * @return ResponseEntity with no content.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        UserDTO currentUser = userService.getUserByUsername(userDetails.getUsername());

        // Prevent users from deleting other users
        if (!currentUser.getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}