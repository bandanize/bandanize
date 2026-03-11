package com.bandanize.backend.services;

import com.bandanize.backend.models.SongListModel;
import com.bandanize.backend.models.SongModel;
import com.bandanize.backend.repositories.SongListRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class SpotifyIntegrationService {

    @Value("${spotify.client-id}")
    private String clientId;

    @Value("${spotify.client-secret}")
    private String clientSecret;

    @Value("${spotify.redirect-uri}")
    private String redirectUri;

    private final SongListRepository songListRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SpotifyIntegrationService(SongListRepository songListRepository) {
        this.songListRepository = songListRepository;
    }

    public String getAuthorizationUrl(Long userId, Long listId) {
        String state = userId + "_" + listId; // Pass context via state
        String scopes = "playlist-modify-public playlist-modify-private";

        return "https://accounts.spotify.com/authorize?" +
                "response_type=code" +
                "&client_id=" + clientId +
                "&scope=" + URLEncoder.encode(scopes, StandardCharsets.UTF_8) +
                "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
                "&state=" + state;
    }

    public String processCallbackAndCreatePlaylist(String code, String state) {
        try {
            // 1. Extract context
            String[] parts = state.split("_");
            if (parts.length != 2) throw new IllegalArgumentException("Invalid state");
            Long userId = Long.parseLong(parts[0]);
            Long listId = Long.parseLong(parts[1]);

            // 2. Exchange code for access token
            String accessToken = getAccessToken(code);

            // 3. Get Spotify User Profile (ID)
            String spotifyUserId = getSpotifyUserId(accessToken);

            // 4. Fetch the SongList from DB with songs eagerly
            SongListModel songList = songListRepository.findByIdWithSongs(listId)
                    .orElseThrow(() -> new RuntimeException("Song list not found"));

            // 5. Create the Playlist in Spotify
            String playlistId = createPlaylist(accessToken, spotifyUserId, songList.getName());

            // 6. Populate asynchronously
            new Thread(() -> populatePlaylistAsync(accessToken, playlistId, songList, listId)).start();

            return playlistId;

        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Error processing Spotify callback: " + e.getMessage());
            return null;
        }
    }

    private void populatePlaylistAsync(String accessToken, String playlistId, SongListModel songList, Long listId) {
        try {
            List<String> trackUris = new ArrayList<>();
            for (SongModel song : songList.getSongs()) {
                String trackUri = searchTrack(accessToken, song.getName(), song.getOriginalBand());
                if (trackUri != null) {
                    trackUris.add(trackUri);
                }
            }

            if (!trackUris.isEmpty()) {
                addTracksToPlaylist(accessToken, playlistId, trackUris);
            }

            System.out.println("Spotify export completed for list: " + listId);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String getAccessToken(String code) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        String auth = clientId + ":" + clientSecret;
        headers.setBasicAuth(Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8)));

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("code", code);
        body.add("redirect_uri", redirectUri);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(
                "https://accounts.spotify.com/api/token", request, String.class);

        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("access_token").asText();
    }

    private String getSpotifyUserId(String accessToken) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<String> request = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
                "https://api.spotify.com/v1/me", HttpMethod.GET, request, String.class);
        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("id").asText();
    }

    private String createPlaylist(String accessToken, String userId, String playlistName) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        String jsonBody = String.format("{\"name\":\"%s (Bandanize)\", \"description\":\"Exported from Bandanize\", \"public\":false}", playlistName);
        HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);

        String url = "https://api.spotify.com/v1/users/" + userId + "/playlists";
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("id").asText();
    }

    private String searchTrack(String accessToken, String trackName, String artistName) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<String> request = new HttpEntity<>(headers);

            String query = trackName;
            if (artistName != null && !artistName.isEmpty()) {
                query += " " + artistName;
            }

            String url = "https://api.spotify.com/v1/search?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8) + "&type=track&limit=1";
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode tracks = root.path("tracks").path("items");
            if (tracks.isArray() && tracks.size() > 0) {
                return tracks.get(0).path("uri").asText();
            }
        } catch (Exception e) {
            System.err.println("Failed to search track: " + trackName);
        }
        return null;
    }

    private void addTracksToPlaylist(String accessToken, String playlistId, List<String> trackUris) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        String jsonBody = "{\"uris\":" + objectMapper.writeValueAsString(trackUris) + "}";
        HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);

        String url = "https://api.spotify.com/v1/playlists/" + playlistId + "/tracks";
        restTemplate.postForEntity(url, request, String.class);
    }
}
