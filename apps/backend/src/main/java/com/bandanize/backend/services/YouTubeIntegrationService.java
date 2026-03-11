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
import java.util.List;

@Service
public class YouTubeIntegrationService {

    @Value("${youtube.client-id}")
    private String clientId;

    @Value("${youtube.client-secret}")
    private String clientSecret;

    @Value("${youtube.redirect-uri}")
    private String redirectUri;

    private final SongListRepository songListRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public YouTubeIntegrationService(SongListRepository songListRepository) {
        this.songListRepository = songListRepository;
    }

    public String getAuthorizationUrl(Long userId, Long listId) {
        String state = userId + "_" + listId; 
        
        // Scope for managing YouTube accounts
        String scopes = "https://www.googleapis.com/auth/youtube";

        return "https://accounts.google.com/o/oauth2/v2/auth?" +
                "response_type=code" +
                "&client_id=" + clientId +
                "&scope=" + URLEncoder.encode(scopes, StandardCharsets.UTF_8) +
                "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
                "&access_type=offline" + // Request offline access to get a refresh token if needed
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

            // 3. Fetch the SongList from DB with songs eagerly
            SongListModel songList = songListRepository.findByIdWithSongs(listId)
                    .orElseThrow(() -> new RuntimeException("Song list not found"));

            // 4. Create the Playlist in YouTube
            String playlistId = createPlaylist(accessToken, songList.getName());

            // 5. Populate asynchronously
            new Thread(() -> populatePlaylistAsync(accessToken, playlistId, songList, listId)).start();

            return playlistId;

        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Error processing YouTube callback: " + e.getMessage());
            return null;
        }
    }

    private void populatePlaylistAsync(String accessToken, String playlistId, SongListModel songList, Long listId) {
        try {
            List<String> videoIds = new ArrayList<>();
            for (SongModel song : songList.getSongs()) {
                String videoId = searchTrack(accessToken, song.getName(), song.getOriginalBand());
                if (videoId != null) {
                    videoIds.add(videoId);
                }
            }

            System.out.println("Found " + videoIds.size() + " videos to add to YouTube playlist.");
            for (String videoId : videoIds) {
                try {
                    addTrackToPlaylist(accessToken, playlistId, videoId);
                    Thread.sleep(500); 
                } catch (Exception e) {
                    System.err.println("Failed to add track " + videoId + " to playlist: " + e.getMessage());
                }
            }
            System.out.println("YouTube Music export completed for list: " + listId);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String getAccessToken(String code) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("code", code);
        body.add("redirect_uri", redirectUri);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(
                "https://oauth2.googleapis.com/token", request, String.class);

        JsonNode root = objectMapper.readTree(response.getBody());
        return root.path("access_token").asText();
    }

    private String createPlaylist(String accessToken, String playlistName) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        String jsonBody = String.format("{\n" +
                "  \"snippet\": {\n" +
                "    \"title\": \"%s (Bandanize)\",\n" +
                "    \"description\": \"Exported from Bandanize\"\n" +
                "  },\n" +
                "  \"status\": {\n" +
                "    \"privacyStatus\": \"private\"\n" +
                "  }\n" +
                "}", playlistName.replace("\"", "\\\""));
                
        HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);

        String url = "https://www.googleapis.com/youtube/v3/playlists?part=snippet,status";
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

            // Removed videoCategoryId=10 because many music videos are uploaded under general categories
            String url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode items = root.path("items");
            if (items.isArray() && items.size() > 0) {
                return items.get(0).path("id").path("videoId").asText();
            } else {
                System.out.println("No YouTube video found for query: " + query);
                System.out.println("YouTube Search API Response: " + response.getBody());
            }
        } catch (Exception e) {
            System.err.println("Failed to search YouTube track: " + trackName);
            e.printStackTrace();
        }
        return null;
    }

    private void addTrackToPlaylist(String accessToken, String playlistId, String videoId) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        String jsonBody = String.format("{\n" +
                "  \"snippet\": {\n" +
                "    \"playlistId\": \"%s\",\n" +
                "    \"resourceId\": {\n" +
                "      \"kind\": \"youtube#video\",\n" +
                "      \"videoId\": \"%s\"\n" +
                "    }\n" +
                "  }\n" +
                "}", playlistId, videoId);

        HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);

        String url = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet";
        restTemplate.postForEntity(url, request, String.class);
    }
}
