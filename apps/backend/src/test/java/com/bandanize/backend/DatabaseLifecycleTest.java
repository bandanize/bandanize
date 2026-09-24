package com.bandanize.backend;

import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.*;
import com.bandanize.backend.services.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DatabaseLifecycleTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired BandRepository bands;
    @Autowired SongRepository songs;
    @Autowired SongListRepository lists;
    @Autowired TablatureRepository tabs;
    @Autowired TabCommentRepository comments;
    @Autowired JwtService jwt;
    @Autowired PlatformTransactionManager transactions;
    @MockitoBean EmailService email;
    @MockitoBean StorageService storage;
    WebTestClient owner, member, stranger;
    Long ownerId, memberId, bandId, listId, songId, tabId;
    String ownerName, memberName;

    WebTestClient client(String name) {
        return WebTestClient.bindToServer().baseUrl("http://localhost:" + port)
            .defaultHeader("Authorization", "Bearer " + jwt.generateToken(name)).build();
    }
    UserModel user(String suffix) {
        UserModel u = new UserModel(); u.setUsername(UUID.randomUUID() + suffix);
        u.setName(suffix); u.setEmail(u.getUsername() + "@example.test"); u.setDisabled(false);
        return users.save(u);
    }
    @BeforeEach void setup() {
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            UserModel a = user("owner"), b = user("member"), c = user("stranger");
            ownerId = a.getId(); memberId = b.getId(); ownerName = a.getUsername(); memberName = b.getUsername();
            owner = client(ownerName); member = client(memberName); stranger = client(c.getUsername());
            BandModel band = new BandModel(); band.setName("Audit"); band.setOwner(a);
            band.getUsers().addAll(List.of(a,b)); band = bands.save(band); bandId = band.getId();
            SongModel song = new SongModel(); song.setBand(band); song.setName("Song");
            song.getFiles().add(new MediaFile("track.wav", "audio/wav", "/api/uploads/audio/track.wav"));
            songId = songs.save(song).getId();
            SongListModel list = new SongListModel(); list.setBand(band); list.setName("Set"); list.getSongs().add(song);
            listId = lists.save(list).getId();
            TablatureModel tab = new TablatureModel(); tab.setSong(song); tab.setName("Guitar"); tab.setContent("Am\nLyrics");
            tab.getFiles().add(new MediaFile("score.pdf", "application/pdf", "/api/uploads/files/score.pdf"));
            tabId = tabs.save(tab).getId();
        });
    }
    @Test void updatingTabTextPreservesAttachments() {
        owner.put().uri("/api/tabs/"+tabId).bodyValue(Map.of("content", "Updated"))
            .exchange().expectStatus().isOk().expectBody().jsonPath("$.files.length()").isEqualTo(1);
    }
    @Test void deletingSharedListPreservesSongAndItsPhysicalFiles() {
        Long other = new TransactionTemplate(transactions).execute(tx -> {
            SongListModel l = new SongListModel(); l.setBand(bands.findById(bandId).orElseThrow()); l.setName("Other");
            l.getSongs().add(songs.findById(songId).orElseThrow()); return lists.save(l).getId();
        });
        owner.delete().uri("/api/songlists/"+listId).exchange().expectStatus().isOk();
        assertTrue(songs.existsById(songId));
        verify(storage, never()).deleteFile(anyString(), anyString());
        owner.delete().uri("/api/songlists/"+other).exchange().expectStatus().isOk();
        assertFalse(songs.existsById(songId)); assertFalse(tabs.existsById(tabId));
    }
    @Test void staleReorderCannotRemoveSongs() {
        owner.put().uri("/api/songlists/"+listId+"/reorder").bodyValue(List.of())
            .exchange().expectStatus().isEqualTo(409);
        owner.get().uri("/api/bands/"+bandId+"/songlists").exchange().expectStatus().isOk()
            .expectBody().jsonPath("$[0].songs.length()").isEqualTo(1);
    }
    @Test void accountWithCommentsCanBeDeletedWithoutLosingOtherMembersWork() {
        member.post().uri("/api/tabs/"+tabId+"/comments").bodyValue(Map.of("message", "Keep this idea"))
            .exchange().expectStatus().isOk();
        member.post().uri("/api/bands/"+bandId+"/chat").bodyValue(Map.of("message", "Keep this message"))
            .exchange().expectStatus().isOk();
        member.delete().uri("/api/users/"+memberId).exchange().expectStatus().isNoContent();
        assertFalse(users.existsById(memberId)); assertTrue(bands.existsById(bandId));
        owner.get().uri("/api/tabs/"+tabId+"/comments").exchange().expectStatus().isOk()
            .expectBody().jsonPath("$[0].message").isEqualTo("Keep this idea").jsonPath("$[0].sender").isEmpty();
        owner.get().uri("/api/bands/"+bandId+"/chat").exchange().expectStatus().isOk()
            .expectBody().jsonPath("$[0].message").isEqualTo("Keep this message");
    }
    @Test void deletingOwnerDeletesOwnedProjectAndAllSongRelations() {
        member.post().uri("/api/tabs/"+tabId+"/comments").bodyValue(Map.of("message", "Idea"))
            .exchange().expectStatus().isOk();
        owner.delete().uri("/api/users/"+ownerId).exchange().expectStatus().isNoContent();
        assertFalse(users.existsById(ownerId)); assertTrue(users.existsById(memberId));
        assertFalse(bands.existsById(bandId)); assertFalse(songs.existsById(songId)); assertFalse(tabs.existsById(tabId));
    }
    @Test void ownerMustTransferOwnershipBeforeLeaving() {
        owner.post().uri("/api/bands/"+bandId+"/leave").exchange().expectStatus().isBadRequest();
    }
    @Test void outsiderCannotReadOrMutateProjectResources() {
        stranger.get().uri("/api/bands/"+bandId).exchange().expectStatus().isForbidden();
        stranger.get().uri("/api/bands/"+bandId+"/songlists").exchange().expectStatus().isForbidden();
        stranger.put().uri("/api/tabs/"+tabId).bodyValue(Map.of("content","Corrupt"))
            .exchange().expectStatus().isForbidden();
        stranger.delete().uri("/api/songlists/"+listId).exchange().expectStatus().isForbidden();
        stranger.put().uri("/api/users/"+ownerId).bodyValue(Map.of("email","wrong@example.test"))
            .exchange().expectStatus().isForbidden();
    }
    @Test void failedVerificationMailDoesNotLeaveAnUnusableAccount() {
        doThrow(new IllegalStateException("Provider unavailable")).when(email).sendVerificationEmail(anyString(), anyString());
        String name = "registration-"+UUID.randomUUID();
        owner.post().uri("/api/auth/register").bodyValue(Map.of("username",name,"email",name+"@example.test","hashedPassword","LongPassword123!"))
            .exchange().expectStatus().is5xxServerError();
        assertTrue(users.findByUsername(name).isEmpty());
    }

    @Test void registrationVerificationLoginAndPasswordResetRoundTrip() {
        String name = "signup-"+UUID.randomUUID(), address = name+"@example.test";
        owner.post().uri("/api/auth/register").bodyValue(Map.of("username",name,"email",address,"hashedPassword","FirstPassword123!","name","Musician"))
            .exchange().expectStatus().isCreated();
        assertTrue(users.findByUsername(name).orElseThrow().isDisabled());
        var token = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(email).sendVerificationEmail(eq(address), token.capture());
        owner.get().uri(uri -> uri.path("/api/auth/verify-email").queryParam("token",token.getValue()).build())
            .exchange().expectStatus().isOk();
        owner.post().uri("/api/auth/login").bodyValue(Map.of("username",address.toUpperCase(),"password","FirstPassword123!"))
            .exchange().expectStatus().isOk().expectBody().jsonPath("$.token").isNotEmpty();
        owner.post().uri("/api/auth/forgot-password").bodyValue(Map.of("email",address)).exchange().expectStatus().isOk();
        var reset = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(email).sendPasswordReset(eq(address), reset.capture());
        owner.post().uri("/api/auth/reset-password").bodyValue(Map.of("token",reset.getValue(),"newPassword","NextPassword123!"))
            .exchange().expectStatus().isOk();
        owner.post().uri("/api/auth/login").bodyValue(Map.of("username",name,"password","NextPassword123!"))
            .exchange().expectStatus().isOk();
        owner.post().uri("/api/auth/reset-password").bodyValue(Map.of("token",jwt.generateToken(name),"newPassword","WrongPassword123!"))
            .exchange().expectStatus().isBadRequest();
    }
    @Test void pendingAccountCanRequestVerificationAndEmailTokensCannotAccessApi() {
        var pending = user("pending"); pending.setDisabled(true); users.save(pending);
        owner.post().uri("/api/auth/resend-verification").bodyValue(Map.of("email",pending.getEmail())).exchange().expectStatus().isOk();
        verify(email).sendVerificationEmail(eq(pending.getEmail()),anyString());
        WebTestClient.bindToServer().baseUrl("http://localhost:"+port)
            .defaultHeader("Authorization","Bearer "+jwt.generateVerificationToken(ownerName)).build()
            .get().uri("/api/auth/me").exchange().expectStatus().isUnauthorized();
    }
    @Autowired BandInvitationRepository invitations;
    @Test void invitationAcceptRemoveReinviteAndRejectPersist() {
        var invited = user("invited"); var guest = client(invited.getUsername());
        owner.post().uri("/api/bands/"+bandId+"/invite").bodyValue(Map.of("email",invited.getEmail())).exchange().expectStatus().isOk();
        Long id = invitations.findByBandIdAndInvitedUserId(bandId,invited.getId()).orElseThrow().getId();
        stranger.post().uri("/api/invitations/"+id+"/accept").exchange().expectStatus().isForbidden();
        for(int i=0;i<2;i++) guest.post().uri("/api/invitations/"+id+"/accept").exchange().expectStatus().isOk();
        guest.get().uri("/api/bands/"+bandId).exchange().expectStatus().isOk();
        owner.delete().uri("/api/bands/"+bandId+"/members/"+invited.getId()).exchange().expectStatus().isOk();
        guest.get().uri("/api/bands/"+bandId).exchange().expectStatus().isForbidden();
        owner.post().uri("/api/bands/"+bandId+"/invite").bodyValue(Map.of("userId",invited.getId().toString())).exchange().expectStatus().isOk();
        guest.post().uri("/api/invitations/"+id+"/reject").exchange().expectStatus().isOk();
        assertEquals(InvitationStatus.REJECTED,invitations.findById(id).orElseThrow().getStatus());
    }
    @Autowired EventRepository events;
    @Test void calendarAndChatRoundTrip() {
        var event=owner.post().uri("/api/bands/"+bandId+"/events")
            .bodyValue(Map.of("name","Rehearsal","date","2026-10-20T18:00:00","timeZone","Europe/Madrid","type","ENSAYO"))
            .exchange().expectStatus().isOk().expectBody(Map.class).returnResult().getResponseBody();
        String id=event.get("id").toString();
        member.put().uri("/api/events/"+id).bodyValue(Map.of("name","New rehearsal")).exchange().expectStatus().isOk();
        stranger.delete().uri("/api/events/"+id).exchange().expectStatus().isForbidden();
        owner.delete().uri("/api/events/"+id).exchange().expectStatus().isOk(); assertFalse(events.existsById(Long.valueOf(id)));
        member.post().uri("/api/bands/"+bandId+"/chat").bodyValue(Map.of("message","Hello"))
            .exchange().expectStatus().isOk().expectBody().jsonPath("$.sender.password").doesNotExist();
        owner.get().uri("/api/bands/"+bandId+"/chat/unread").exchange().expectStatus().isOk().expectBody(Boolean.class).isEqualTo(true);
        owner.post().uri("/api/bands/"+bandId+"/chat/read").exchange().expectStatus().isOk();
        owner.get().uri("/api/bands/"+bandId+"/chat/unread").exchange().expectStatus().isOk().expectBody(Boolean.class).isEqualTo(false);
    }
    @Test void songMoveCopyReplicateAndDeleteRespectMembership() {
        Long target=new TransactionTemplate(transactions).execute(tx -> {
            SongListModel l=new SongListModel(); l.setBand(bands.findById(bandId).orElseThrow()); l.setName("Target"); return lists.save(l).getId();
        });
        var created=owner.post().uri("/api/songlists/"+listId+"/songs").bodyValue(Map.of("name","New song"))
            .exchange().expectStatus().isOk().expectBody(Map.class).returnResult().getResponseBody();
        String id=created.get("id").toString();
        owner.put().uri("/api/songs/"+id+"/move?sourceListId="+listId+"&targetListId="+target).exchange().expectStatus().isOk();
        owner.post().uri("/api/songs/"+id+"/copy?sourceListId="+target+"&targetListId="+listId).exchange().expectStatus().isOk();
        var copied=owner.post().uri("/api/songs/"+id+"/replicate?targetListId="+target)
            .exchange().expectStatus().isOk().expectBody(Map.class).returnResult().getResponseBody();
        assertNotEquals(id,copied.get("id").toString());
        owner.delete().uri("/api/songs/"+id+"?listId="+target).exchange().expectStatus().isNoContent(); assertTrue(songs.existsById(Long.valueOf(id)));
        owner.delete().uri("/api/songs/"+id+"?listId="+listId).exchange().expectStatus().isNoContent(); assertFalse(songs.existsById(Long.valueOf(id)));
    }
}
