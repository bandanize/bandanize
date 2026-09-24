package com.bandanize.backend.services;

import com.bandanize.backend.models.EventModel;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.List;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

class CalendarFeedWriterTest {
    private EventModel event(String date, String zone) {
        EventModel event = new EventModel();
        event.setId(42L); event.setName("Ensayo"); event.setDate(LocalDateTime.parse(date)); event.setTimeZone(zone);
        return event;
    }
    @Test void madridLegacyDatesRespectSummerAndWinterOffsets() {
        assertTrue(CalendarFeedWriter.write("Band",List.of(event("2026-07-20T20:00:00",null))).contains("DTSTART:20260720T180000Z\r\n"));
        assertTrue(CalendarFeedWriter.write("Band",List.of(event("2026-01-20T20:00:00","Europe/Madrid"))).contains("DTSTART:20260120T190000Z\r\n"));
    }
    @Test void handlesOtherTimeZonesAndDateBoundaries() {
        assertTrue(CalendarFeedWriter.write("Band",List.of(event("2026-07-20T20:00:00","America/New_York"))).contains("DTSTART:20260721T000000Z\r\n"));
        assertTrue(CalendarFeedWriter.write("Band",List.of(event("2026-07-20T01:00:00","Asia/Tokyo"))).contains("DTSTART:20260719T160000Z\r\n"));
    }
    @Test void preservesUidAndEscapesAndFoldsUtf8() {
        EventModel event = event("2026-07-20T20:00:00","Europe/Madrid");
        event.setName("Música 🎸".repeat(30));
        event.setDescription("Línea 1\r\nBEGIN:VEVENT;coma,barra\\");
        String feed = CalendarFeedWriter.write("Grupo\r\nOtro",List.of(event));
        assertTrue(feed.contains("UID:42@bandanize\r\n"));
        assertTrue(feed.contains("DTSTAMP:")); assertTrue(feed.contains("LAST-MODIFIED:")); assertTrue(feed.contains("SEQUENCE:0"));
        assertFalse(feed.contains("\r\nBEGIN:VEVENT;"));
        for (String line : feed.split("\r\n")) assertTrue(line.getBytes(StandardCharsets.UTF_8).length <= 75);
        assertTrue(feed.replace("\r\n ","").contains(event.getName()));
    }
}
