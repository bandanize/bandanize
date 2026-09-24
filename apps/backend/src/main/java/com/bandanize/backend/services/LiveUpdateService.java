package com.bandanize.backend.services;

import com.bandanize.backend.models.BandModel;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import jakarta.annotation.PreDestroy;
import java.util.*;
import java.util.concurrent.*;

@Service
public class LiveUpdateService {
    private final Map<String, Set<SseEmitter>> clients = new ConcurrentHashMap<>();
    private final ScheduledExecutorService heartbeat = Executors.newSingleThreadScheduledExecutor();
    private final ExecutorService delivery = Executors.newFixedThreadPool(2);
    public LiveUpdateService() {
        heartbeat.scheduleAtFixedRate(() -> clients.forEach((user, streams) ->
            streams.forEach(stream -> send(user, stream, "heartbeat", Map.of()))), 15, 15, TimeUnit.SECONDS);
    }
    public SseEmitter subscribe(String username) {
        SseEmitter stream = new SseEmitter(60000L);
        clients.computeIfAbsent(username, key -> ConcurrentHashMap.newKeySet()).add(stream);
        Runnable remove = () -> clients.computeIfPresent(username, (key, streams) -> {
            streams.remove(stream); return streams.isEmpty() ? null : streams;
        });
        stream.onCompletion(remove); stream.onTimeout(remove); stream.onError(error -> remove.run());
        send(username, stream, "ready", Map.of());
        return stream;
    }
    private void send(String username, SseEmitter stream, String event, Object data) {
        try { stream.send(SseEmitter.event().name(event).data(data)); }
        catch (Exception error) {
            clients.computeIfPresent(username, (key, streams) -> {
                streams.remove(stream); return streams.isEmpty() ? null : streams;
            });
            stream.complete();
        }
    }
    public void userChanged(String username, String kind, Long bandId) {
        publish(Set.of(username), kind, bandId);
    }
    public void bandChanged(BandModel band, String kind) {
        Set<String> recipients = new HashSet<>();
        band.getUsers().forEach(user -> recipients.add(user.getUsername()));
        if (band.getOwner() != null) recipients.add(band.getOwner().getUsername());
        recipients.remove(null);
        publish(recipients, kind, band.getId());
    }
    private void publish(Set<String> recipients, String kind, Long bandId) {
        Map<String, Object> payload = Map.of("kind", kind, "bandId", bandId);
        Runnable notify = () -> delivery.execute(() -> recipients.forEach(user ->
            clients.getOrDefault(user, Set.of()).forEach(stream -> send(user, stream, "change", payload))));
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { notify.run(); }
            });
        } else notify.run();
    }
    @PreDestroy public void shutdown() {
        heartbeat.shutdownNow(); delivery.shutdownNow();
        clients.values().forEach(streams -> streams.forEach(SseEmitter::complete));
        clients.clear();
    }
}
