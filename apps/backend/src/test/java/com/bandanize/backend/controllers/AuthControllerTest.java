package com.bandanize.backend.controllers;

import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.repositories.UserRepository;
import com.bandanize.backend.services.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class AuthControllerTest {
    @Autowired private WebApplicationContext context;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder passwordEncoder;
    @MockitoBean private EmailService emailService;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        UserModel user = new UserModel();
        user.setUsername("CaseSensitiveMusician");
        // Existing accounts may contain mixed-case addresses.
        user.setEmail("Musician@Example.com");
        user.setName("Test Musician");
        user.setHashedPassword(passwordEncoder.encode("CorrectPassword123!"));
        user.setDisabled(false);
        users.saveAndFlush(user);
    }

    @Test
    void loginAcceptsAllEmailCasesAndTrimsWhitespace() throws Exception {
        for (String email : new String[] {
                "musician@example.com", "MUSICIAN@EXAMPLE.COM", " Musician@Example.com " }) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"username\":\"" + email + "\",\"password\":\"CorrectPassword123!\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.username").value("CaseSensitiveMusician"))
                    .andExpect(jsonPath("$.token").isNotEmpty());
        }
    }

    @Test
    void loginStillAcceptsExactUsernameAndRejectsIncorrectPassword() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"CaseSensitiveMusician\",\"password\":\"CorrectPassword123!\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"MUSICIAN@EXAMPLE.COM\",\"password\":\"incorrect\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void disabledAccountsCannotLoginWithDifferentEmailCase() throws Exception {
        UserModel user = users.findByUsername("CaseSensitiveMusician").orElseThrow();
        user.setDisabled(true);
        users.saveAndFlush(user);
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"MUSICIAN@EXAMPLE.COM\",\"password\":\"CorrectPassword123!\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void registrationRejectsEmailAlreadyRegisteredWithDifferentCase() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"anotherMusician\",\"email\":\"MUSICIAN@example.com\","
                        + "\"hashedPassword\":\"CorrectPassword123!\"}"))
                .andExpect(status().isConflict());
        assertThat(users.findByUsername("anotherMusician")).isEmpty();
    }

    @Test
    void registrationNormalizesEmailBeforeValidationAndSaving() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"newMusician\",\"email\":\" New@Example.com \","
                        + "\"hashedPassword\":\"CorrectPassword123!\"}"))
                .andExpect(status().isCreated());
        UserModel user = users.findByUsername("newMusician").orElseThrow();
        assertThat(user.getEmail()).isEqualTo("new@example.com");
        assertThat(user.isDisabled()).isTrue();
        assertThat(passwordEncoder.matches("CorrectPassword123!", user.getHashedPassword())).isTrue();
    }

    @Test
    void passwordResetFindsExistingMixedCaseEmail() throws Exception {
        mvc.perform(post("/api/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\" MUSICIAN@EXAMPLE.COM \"}"))
                .andExpect(status().isOk());
        verify(emailService).sendPasswordReset(eq("Musician@Example.com"), anyString());
    }
}
