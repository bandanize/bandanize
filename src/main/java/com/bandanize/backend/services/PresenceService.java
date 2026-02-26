package com.bandanize.backend.services;

import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class PresenceService {

    // Map<ProjectId, Map<UserId, LastSeenTimestamp>>
    private final Map<String, Map<String, Instant>> projectPresence = new ConcurrentHashMap<>();

    private static final long ONLINE_THRESHOLD_SECONDS = 120; // 2 minutes

    public void heartbeat(String projectId, String userId) {
        projectPresence.computeIfAbsent(projectId, k -> new ConcurrentHashMap<>())
                .put(userId, Instant.now());
    }

    public long getOnlineCount(String projectId) {
        Map<String, Instant> users = projectPresence.get(projectId);
        if (users == null)
            return 0;

        Instant threshold = Instant.now().minusSeconds(ONLINE_THRESHOLD_SECONDS);

        // Cleanup old entries (optional, or do it periodically)
        // For simplicity, just count active ones
        return users.values().stream()
                .filter(lastSeen -> lastSeen.isAfter(threshold))
                .count();
    }
}
