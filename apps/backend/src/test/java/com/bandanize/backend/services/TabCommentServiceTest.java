package com.bandanize.backend.services;

import com.bandanize.backend.dtos.TabCommentRequest;
import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.*;
import com.bandanize.backend.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TabCommentServiceTest {
    @Mock TabCommentRepository tabCommentRepository;
    @Mock TablatureRepository tablatureRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @InjectMocks TabCommentService service;
    TablatureModel tab;
    UserModel member;

    @BeforeEach void setup() {
        member = new UserModel(); member.setId(1L);
        BandModel band = new BandModel(); band.setUsers(List.of(member));
        SongModel song = new SongModel(); song.setBand(band);
        tab = new TablatureModel(); tab.setId(10L); tab.setSong(song); tab.setContent("Am\nUna melodía\nC");
        when(tablatureRepository.findById(10L)).thenReturn(Optional.of(tab));
    }
    void allowSave() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(member));
        when(tabCommentRepository.save(any())).thenAnswer(call -> call.getArgument(0));
    }
    @Test void savesSelectedPassageAndRenamedAttachment() {
        allowSave();
        MediaFile file = new MediaFile("Ensayo acústico.wav", "audio/wav", "/api/uploads/audio/123_Ensayo acústico.wav");
        TabCommentModel result = service.addComment(10L, 1L, new TabCommentRequest(" Más suave ", 3, 14, "Una melodía", List.of(file)));
        assertEquals("Más suave", result.getMessage()); assertEquals(3, result.getAnchorStart());
        assertEquals("Una melodía", result.getQuote()); assertEquals(file, result.getAttachments().get(0));
    }
    @Test void allowsAttachmentOnlyAndLegacyMessage() {
        allowSave();
        assertEquals("", service.addComment(10L,1L,new TabCommentRequest(null,null,null,null,List.of(new MediaFile("Demo.mp3","audio/mpeg","/api/uploads/audio/demo.mp3")))).getMessage());
        assertNull(service.addComment(10L,1L,new TabCommentRequest("General",null,null,null,null)).getQuote());
    }
    @Test void rejectsStaleAndOutOfBoundsSelections() {
        for (TabCommentRequest request : List.of(new TabCommentRequest("Note",3,14,"Old version",null),new TabCommentRequest("Note",-1,4,"Am",null),new TabCommentRequest("Note",0,200,"Am",null),new TabCommentRequest("Note",null,2,"Am",null)))
            assertThrows(IllegalArgumentException.class, () -> service.addComment(10L,1L,request));
        verifyNoInteractions(tabCommentRepository);
    }
    @Test void rejectsForeignAndTraversalAttachments() {
        for (String url : List.of("https://example.test/a.wav","/api/uploads/audio/../private","/api/uploads/audio/a%2fb","/api/uploads/audio/a?x=y"))
            assertThrows(IllegalArgumentException.class, () -> service.addComment(10L,1L,new TabCommentRequest("Note",null,null,null,List.of(new MediaFile("Demo.wav","audio/wav",url)))));
        verifyNoInteractions(tabCommentRepository);
    }
    @Test void rejectsEmptyOrExcessiveAttachments() {
        assertThrows(IllegalArgumentException.class, () -> service.addComment(10L,1L,new TabCommentRequest(" ",null,null,null,null)));
        MediaFile file = new MediaFile("a","audio/wav","/api/uploads/audio/a");
        assertThrows(IllegalArgumentException.class, () -> service.addComment(10L,1L,new TabCommentRequest("",null,null,null,java.util.Collections.nCopies(6,file))));
    }
    @Test void nonMembersCannotReadOrWrite() {
        assertThrows(AccessDeniedException.class, () -> service.getComments(10L,2L));
        assertThrows(AccessDeniedException.class, () -> service.addComment(10L,2L,new TabCommentRequest("Hi",null,null,null,null)));
        verifyNoInteractions(tabCommentRepository);
    }
    @Test void cannotDeleteCommentFromAnotherTab() {
        TablatureModel other = new TablatureModel(); other.setId(11L);
        TabCommentModel comment = new TabCommentModel(); comment.setTablature(other); comment.setSender(member);
        when(tabCommentRepository.findById(100L)).thenReturn(Optional.of(comment));
        assertThrows(ResourceNotFoundException.class, () -> service.deleteComment(10L,100L,1L));
        verify(tabCommentRepository,never()).delete(any());
    }
    @Test void onlyAuthorCanDelete() {
        UserModel other = new UserModel(); other.setId(2L);
        TabCommentModel comment = new TabCommentModel(); comment.setTablature(tab); comment.setSender(other);
        when(tabCommentRepository.findById(100L)).thenReturn(Optional.of(comment));
        assertThrows(AccessDeniedException.class, () -> service.deleteComment(10L,100L,1L));
        comment.setSender(member); service.deleteComment(10L,100L,1L);
        verify(tabCommentRepository).delete(comment);
    }
}
