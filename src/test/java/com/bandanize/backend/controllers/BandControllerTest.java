package com.bandanize.backend.controllers;

import com.bandanize.backend.dtos.BandDTO;
import com.bandanize.backend.services.BandService;
import com.bandanize.backend.services.JwtService;
import com.bandanize.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@SpringBootTest
class BandControllerTest {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @MockitoBean
    private BandService bandService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private com.bandanize.backend.repositories.UserRepository userRepository;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @Test
    @WithMockUser
    void getAllBands_ReturnsListOfBands() throws Exception {
        BandDTO band1 = new BandDTO();
        band1.setId(1L);
        band1.setName("Test Band 1");

        BandDTO band2 = new BandDTO();
        band2.setId(2L);
        band2.setName("Test Band 2");

        List<BandDTO> bands = Arrays.asList(band1, band2);

        when(bandService.getAllBands()).thenReturn(bands);

        mockMvc.perform(get("/api/bands")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Test Band 1"))
                .andExpect(jsonPath("$[1].name").value("Test Band 2"));
    }
}
