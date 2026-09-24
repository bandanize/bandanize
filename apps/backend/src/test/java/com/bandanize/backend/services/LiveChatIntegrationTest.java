package com.bandanize.backend.services;

import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class LiveChatIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired BandRepository bands;
    @Autowired ChatMessageRepository messages;
    @Autowired BandInvitationRepository invitations;
    @Autowired ChatService chat;
    @Autowired BandService bandService;
    @Autowired LiveUpdateService live;
    MockMvc mvc;
    UserModel owner, guest;
    BandModel band;
    @BeforeEach void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        owner = user("live-owner"); guest = user("live-guest");
        band = new BandModel(); band.setName("Live rehearsal"); band.setOwner(owner);
        band.getUsers().add(owner); band.getUsers().add(guest); band = bands.saveAndFlush(band);
    }
    UserModel user(String name) {
        return users.findByUsername(name).orElseGet(() -> {
            UserModel user = new UserModel(); user.setUsername(name); user.setName(name);
            user.setEmail(name + "@example.test"); user.setDisabled(false);
            return users.saveAndFlush(user);
        });
    }
    @Test @WithMockUser("live-owner")
    void historyIsStableAndCannotSpoofSender() throws Exception {
        ChatMessageModel first = new ChatMessageModel(); first.setBand(band); first.setSender(owner);
        first.setMessage("First legacy"); first.setTimestamp(null); first = messages.saveAndFlush(first);
        ChatMessageModel second = new ChatMessageModel(); second.setBand(band); second.setSender(guest);
        second.setMessage("Second legacy"); second.setTimestamp(LocalDateTime.now().minusYears(2)); messages.saveAndFlush(second);
        for (int i=0; i<2; i++) mvc.perform(get("/api/bands/" + band.getId() + "/chat"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].message").value("First legacy"))
            .andExpect(jsonPath("$[1].message").value("Second legacy"));
        mvc.perform(post("/api/bands/" + band.getId() + "/chat").contentType("application/json")
            .content("{\"userId\":" + guest.getId() + ",\"message\":\"Authenticated sender\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.sender.id").value(owner.getId().intValue()));
    }
    @Test @WithMockUser("live-guest")
    void committedMessageArrivesOnAuthenticatedStream() throws Exception {
        MvcResult stream = mvc.perform(get("/api/live/events")).andExpect(request().asyncStarted())
            .andExpect(header().string("X-Accel-Buffering","no")).andReturn();
        assertThat(stream.getResponse().getContentAsString()).contains("event:ready");
        chat.sendMessage(band.getId(), owner.getId(), "Live message");
        long deadline=System.currentTimeMillis()+3000;
        while (!stream.getResponse().getContentAsString().contains("event:change") && System.currentTimeMillis()<deadline) Thread.sleep(20);
        assertThat(stream.getResponse().getContentAsString()).contains("event:change", "\"kind\":\"chat\"");
    }
    @Test @WithMockUser("live-owner")
    void cannotAcceptAnotherUsersInvitation() throws Exception {
        BandInvitationModel invite = new BandInvitationModel(); invite.setBand(band); invite.setInvitedUser(guest);
        invite.setStatus(InvitationStatus.PENDING); invite = invitations.saveAndFlush(invite);
        mvc.perform(post("/api/invitations/" + invite.getId() + "/accept")).andExpect(status().isForbidden());
        assertThat(invitations.findById(invite.getId()).orElseThrow().getStatus()).isEqualTo(InvitationStatus.PENDING);
    }
    @Test @WithMockUser("live-guest")
    void acceptingTwiceIsSafeAndDoesNotDuplicateExistingMembership() throws Exception {
        BandInvitationModel invite = new BandInvitationModel(); invite.setBand(band); invite.setInvitedUser(guest);
        invite.setStatus(InvitationStatus.PENDING); invite = invitations.saveAndFlush(invite);
        for (int i=0;i<2;i++) mvc.perform(post("/api/invitations/" + invite.getId() + "/accept")).andExpect(status().isOk());
        assertThat(invitations.findById(invite.getId()).orElseThrow().getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
    }
}
