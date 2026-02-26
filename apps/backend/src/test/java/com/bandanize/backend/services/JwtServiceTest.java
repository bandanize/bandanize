package com.bandanize.backend.services;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        org.springframework.test.util.ReflectionTestUtils.setField(jwtService, "secretString",
                "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        org.springframework.test.util.ReflectionTestUtils.setField(jwtService, "jwtExpiration", 36000000L);
        org.springframework.test.util.ReflectionTestUtils.setField(jwtService, "resetTokenExpiration", 900000L);
        org.springframework.test.util.ReflectionTestUtils.setField(jwtService, "verificationTokenExpiration",
                86400000L);
        jwtService.init();

        userDetails = new User("testuser", "password", new ArrayList<>());
    }

    @Test
    void generateToken_ReturnsToken() {
        String token = jwtService.generateToken("testuser");
        assertNotNull(token);
        assertTrue(token.length() > 0);
    }

    @Test
    void extractUsername_ReturnsCorrectUsername() {
        String token = jwtService.generateToken("testuser");
        String username = jwtService.extractUsername(token);
        assertEquals("testuser", username);
    }

    @Test
    void validateToken_ValidToken_ReturnsTrue() {
        String token = jwtService.generateToken("testuser");
        assertTrue(jwtService.validateToken(token, userDetails));
    }

    @Test
    void validateToken_InvalidUser_ReturnsFalse() {
        String token = jwtService.generateToken("testuser");
        UserDetails otherUser = new User("otheruser", "password", new ArrayList<>());
        assertFalse(jwtService.validateToken(token, otherUser));
    }

    @Test
    void generateResetToken_ReturnsValidToken() {
        String token = jwtService.generateResetToken("test@example.com");
        assertNotNull(token);
        assertTrue(token.length() > 0);
        // The reset token uses email as subject
        String subject = jwtService.extractUsername(token);
        assertEquals("test@example.com", subject);
    }

    @Test
    void generateVerificationToken_ReturnsValidToken() {
        String token = jwtService.generateVerificationToken("test@example.com");
        assertNotNull(token);
        assertTrue(token.length() > 0);
        String subject = jwtService.extractUsername(token);
        assertEquals("test@example.com", subject);
    }

    @Test
    void validateToken_ExpiredToken_ReturnsFalse() {
        // Create a JwtService with very short expiration
        JwtService shortLivedService = new JwtService();
        org.springframework.test.util.ReflectionTestUtils.setField(shortLivedService, "secretString",
                "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        org.springframework.test.util.ReflectionTestUtils.setField(shortLivedService, "jwtExpiration", 1L); // 1ms
        org.springframework.test.util.ReflectionTestUtils.setField(shortLivedService, "resetTokenExpiration", 1L);
        org.springframework.test.util.ReflectionTestUtils.setField(shortLivedService, "verificationTokenExpiration",
                1L);
        shortLivedService.init();

        String token = shortLivedService.generateToken("testuser");

        // Wait for the token to expire
        try {
            Thread.sleep(50);
        } catch (InterruptedException ignored) {
        }

        assertThrows(io.jsonwebtoken.ExpiredJwtException.class,
                () -> shortLivedService.validateToken(token, userDetails));
    }
}
