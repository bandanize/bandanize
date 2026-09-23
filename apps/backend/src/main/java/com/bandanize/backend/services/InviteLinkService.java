package com.bandanize.backend.services;

import com.bandanize.backend.exceptions.ResourceNotFoundException;
import com.bandanize.backend.models.BandModel;
import com.bandanize.backend.models.UserModel;
import com.bandanize.backend.repositories.BandRepository;
import com.bandanize.backend.repositories.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

@Service
@Transactional
public class InviteLinkService {
    private final BandRepository bands;
    private final UserRepository users;
    private final SecureRandom random = new SecureRandom();

    public InviteLinkService(BandRepository bands, UserRepository users) {
        this.bands = bands;
        this.users = users;
    }

    public record Link(String token, Instant expiresAt) {}
    public record Preview(String bandName, Instant expiresAt) {}
    public record Joined(Long bandId) {}

    public Link create(Long bandId, String username) {
        BandModel band = ownedBand(bandId, username);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        band.setInviteTokenHash(hash(token));
        band.setInviteExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
        bands.save(band);
        return new Link(token, band.getInviteExpiresAt());
    }

    public void revoke(Long bandId, String username) {
        BandModel band = ownedBand(bandId, username);
        band.setInviteTokenHash(null);
        band.setInviteExpiresAt(null);
        bands.save(band);
    }

    public Preview preview(String token) {
        BandModel band = validBand(token);
        return new Preview(band.getName(), band.getInviteExpiresAt());
    }

    public Joined accept(String token, String username) {
        UserModel user = users.findByUsername(username)
                .orElseThrow(() -> new AccessDeniedException("Sign in to join this project"));
        if (!user.isEnabled()) throw new AccessDeniedException("Verify your email first");
        BandModel band = validBand(token);
        if (band.getUsers().stream().noneMatch(member -> member.getId().equals(user.getId()))
                && (band.getOwner() == null || !band.getOwner().getId().equals(user.getId()))) {
            band.getUsers().add(user);
            bands.save(band);
        }
        return new Joined(band.getId());
    }

    private BandModel ownedBand(Long bandId, String username) {
        BandModel band = bands.findLockedById(bandId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        if (band.getOwner() == null || !band.getOwner().getUsername().equals(username))
            throw new AccessDeniedException("Only the owner can manage invitation links");
        return band;
    }

    private BandModel validBand(String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}"))
            throw new ResourceNotFoundException("Invitation link is invalid or expired");
        BandModel band = bands.findByInviteTokenHash(hash(token))
                .orElseThrow(() -> new ResourceNotFoundException("Invitation link is invalid or expired"));
        if (band.getInviteExpiresAt() == null || !band.getInviteExpiresAt().isAfter(Instant.now()))
            throw new ResourceNotFoundException("Invitation link is invalid or expired");
        return band;
    }

    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
