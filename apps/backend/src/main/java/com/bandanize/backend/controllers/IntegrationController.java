package com.bandanize.backend.controllers;

import com.bandanize.backend.dtos.UserDTO;
import com.bandanize.backend.services.SpotifyIntegrationService;
import com.bandanize.backend.services.YouTubeIntegrationService;
import com.bandanize.backend.services.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/integrations")
public class IntegrationController {

    private final SpotifyIntegrationService spotifyIntegrationService;
    private final YouTubeIntegrationService youtubeIntegrationService;
    private final UserService userService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public IntegrationController(
            SpotifyIntegrationService spotifyIntegrationService,
            YouTubeIntegrationService youtubeIntegrationService,
            UserService userService) {
        this.spotifyIntegrationService = spotifyIntegrationService;
        this.youtubeIntegrationService = youtubeIntegrationService;
        this.userService = userService;
    }

    @GetMapping("/spotify/auth-url")
    public ResponseEntity<?> getSpotifyAuthUrl(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam Long listId
    ) {
        try {
            UserDTO user = userService.getUserByUsername(principal.getUsername());
            String url = spotifyIntegrationService.getAuthorizationUrl(user.getId(), listId);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }

    @GetMapping("/spotify/callback")
    public ResponseEntity<String> handleSpotifyCallback(
            @RequestParam String code,
            @RequestParam String state
    ) {
        String playlistId = spotifyIntegrationService.processCallbackAndCreatePlaylist(code, state);

        if (playlistId != null) {
            String url = "https://open.spotify.com/playlist/" + playlistId;
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(generateSuccessHtml("Spotify", url, "#1DB954"));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.TEXT_HTML)
                .body(generateErrorHtml("Spotify"));
    }

    @GetMapping("/youtube/auth-url")
    public ResponseEntity<?> getYouTubeAuthUrl(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam Long listId
    ) {
        try {
            UserDTO user = userService.getUserByUsername(principal.getUsername());
            String url = youtubeIntegrationService.getAuthorizationUrl(user.getId(), listId);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }

    @GetMapping("/youtube/callback")
    public ResponseEntity<String> handleYouTubeCallback(
            @RequestParam String code,
            @RequestParam String state
    ) {
        String playlistId = youtubeIntegrationService.processCallbackAndCreatePlaylist(code, state);
        
        if (playlistId != null) {
            String url = "https://music.youtube.com/playlist?list=" + playlistId;
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(generateSuccessHtml("YouTube Music", url, "#FF0000"));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .contentType(MediaType.TEXT_HTML)
                .body(generateErrorHtml("YouTube Music"));
    }

    private String generateSuccessHtml(String platform, String playlistUrl, String color) {
        return "<!DOCTYPE html>\n" +
                "<html lang=\"es\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "    <title>Exportación a " + platform + " iniciada</title>\n" +
                "    <style>\n" +
                "        body { font-family: 'Inter', -apple-system, sans-serif; background-color: #121212; color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }\n" +
                "        .container { text-align: center; background: #1e1e1e; padding: 40px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.5); max-width: 450px; border: 1px solid #333; }\n" +
                "        h2 { margin-top: 0; margin-bottom: 15px; }\n" +
                "        p { color: #cccccc; margin-bottom: 30px; line-height: 1.6; font-size: 15px; }\n" +
                "        a.button { display: inline-block; padding: 14px 24px; background-color: " + color + "; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; margin-bottom: 15px; width: 100%; box-sizing: border-box; transition: opacity 0.2s; }\n" +
                "        a.button:hover { opacity: 0.9; }\n" +
                "        button.close { background: transparent; color: #aaaaaa; border: 1px solid #555; padding: 12px 20px; border-radius: 8px; cursor: pointer; width: 100%; font-size: 15px; transition: background 0.2s; }\n" +
                "        button.close:hover { background: #333; color: white; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"container\">\n" +
                "        <h2>✅ Exportación iniciada</h2>\n" +
                "        <p>Tu lista se ha creado con éxito en <b>" + platform + "</b>.<br><br>⚠️ Estamos añadiendo las canciones poco a poco en segundo plano para no saturar al proveedor. <b>Es posible que la lista aparezca temporalmente vacía o incompleta si la abres ahora mismo.</b> Dale uno o dos minutos antes de refrescar.</p>\n" +
                "        <a href=\"" + playlistUrl + "\" class=\"button\">Abrir lista en " + platform + "</a>\n" +
                "        <button class=\"close\" onclick=\"window.close()\">Cerrar esta pestaña</button>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
    }

    private String generateErrorHtml(String platform) {
        return "<!DOCTYPE html>\n" +
                "<html lang=\"es\">\n" +
                "<head>\n" +
                "    <meta charset=\"UTF-8\">\n" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "    <title>Error al exportar</title>\n" +
                "    <style>\n" +
                "        body { font-family: 'Inter', -apple-system, sans-serif; background-color: #121212; color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }\n" +
                "        .container { text-align: center; background: #2a1111; padding: 40px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.5); border: 1px solid #662222; max-width: 450px; }\n" +
                "        p { color: #cccccc; margin-bottom: 30px; line-height: 1.6; }\n" +
                "        button.close { background: transparent; color: #aaaaaa; border: 1px solid #555; padding: 12px 20px; border-radius: 8px; cursor: pointer; width: 100%; font-size: 15px; }\n" +
                "        button.close:hover { background: #333; color: white; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class=\"container\">\n" +
                "        <h2>❌ Error de conexión</h2>\n" +
                "        <p>Ocurrió un problema al intentar conectar con <b>" + platform + "</b>. Es probable que no hayas autorizado a la aplicación o que las credenciales del servidor hayan expirado.</p>\n" +
                "        <button class=\"close\" onclick=\"window.close()\">Cerrar esta pestaña</button>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>";
    }
}
