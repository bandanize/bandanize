package com.bandanize.backend.controllers;

import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.UserRepository;
import com.bandanize.backend.services.InviteLinkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import java.time.Instant;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
class InviteLinkControllerTest {
    @Autowired private WebApplicationContext context;
    @Autowired private BandRepository bands;
    @Autowired private UserRepository users;
    @Autowired private InviteLinkService links;
    private MockMvc mvc;
    private BandModel band;
    private UserModel guest;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        UserModel owner = user("link-owner");
        guest = user("link-guest");
        band = new BandModel();
        band.setName("Private rehearsal");
        band.setOwner(owner);
        band.getUsers().add(owner);
        bands.saveAndFlush(band);
    }

    private UserModel user(String name) {
        UserModel user = new UserModel();
        user.setUsername(name);
        user.setEmail(name + "@example.com");
        user.setName(name);
        user.setDisabled(false);
        return users.saveAndFlush(user);
    }

    @Test
    void previewIsPublicAndDoesNotRevealMembersOrTokenHash() throws Exception {
        var link = links.create(band.getId(), "link-owner");
        assertThat(band.getInviteTokenHash()).isNotEqualTo(link.token()).hasSize(64);
        mvc.perform(get("/api/invite-links/" + link.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bandName").value("Private rehearsal"))
                .andExpect(jsonPath("$.members").doesNotExist())
                .andExpect(jsonPath("$.inviteTokenHash").doesNotExist())
                .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    void anonymousVisitorCannotJoin() throws Exception {
        var link = links.create(band.getId(), "link-owner");
        mvc.perform(post("/api/invite-links/" + link.token() + "/accept"))
                .andExpect(status().is4xxClientError());
        assertThat(band.getUsers()).hasSize(1);
    }

    @Test
    @WithMockUser("link-guest")
    void verifiedUserCanJoinOnceWithoutBecomingOwner() throws Exception {
        var link = links.create(band.getId(), "link-owner");
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/invite-links/" + link.token() + "/accept"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.bandId").value(band.getId().intValue()));
        }
        assertThat(band.getUsers()).hasSize(2).contains(guest);
        assertThat(band.getOwner().getUsername()).isEqualTo("link-owner");
    }

    @Test
    @WithMockUser("link-guest")
    void nonOwnerCannotGenerateOrRevokeLinks() throws Exception {
        mvc.perform(post("/api/bands/" + band.getId() + "/invite-link"))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/bands/" + band.getId() + "/invite-link"))
                .andExpect(status().isForbidden());
    }

    @Test
    void unverifiedAccountCannotJoin() {
        var link = links.create(band.getId(), "link-owner");
        guest.setDisabled(true);
        users.saveAndFlush(guest);
        assertThatThrownBy(() -> links.accept(link.token(), "link-guest"))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(band.getUsers()).hasSize(1);
    }

    @Test
    void regeneratedRevokedAndExpiredLinksCannotBeUsed() throws Exception {
        var first = links.create(band.getId(), "link-owner");
        var second = links.create(band.getId(), "link-owner");
        mvc.perform(get("/api/invite-links/" + first.token())).andExpect(status().isNotFound());
        links.revoke(band.getId(), "link-owner");
        mvc.perform(get("/api/invite-links/" + second.token())).andExpect(status().isNotFound());
        var expired = links.create(band.getId(), "link-owner");
        band.setInviteExpiresAt(Instant.now().minusSeconds(1));
        bands.saveAndFlush(band);
        mvc.perform(get("/api/invite-links/" + expired.token())).andExpect(status().isNotFound());
        assertThat(band.getUsers()).hasSize(1);
    }

    @Test
    @WithMockUser("link-guest")
    void nonMemberCannotObtainPrivateCalendarFeedToken() throws Exception {
        mvc.perform(get("/api/bands/" + band.getId() + "/calendar-token"))
                .andExpect(status().isForbidden());
        links.accept(links.create(band.getId(), "link-owner").token(), "link-guest");
        mvc.perform(get("/api/bands/" + band.getId() + "/calendar-token"))
                .andExpect(status().isOk());
    }
}
