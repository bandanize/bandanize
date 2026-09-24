package com.bandanize.backend.services;

import com.bandanize.backend.models.EventModel;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** A live RFC 5545 feed with stable event IDs and explicit UTC instants. */
public final class CalendarFeedWriter {
    private CalendarFeedWriter() {}
    private static final DateTimeFormatter UTC = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    public static String write(String name, List<EventModel> events) {
        StringBuilder result = new StringBuilder();
        line(result, "BEGIN:VCALENDAR");
        line(result, "VERSION:2.0");
        line(result, "PRODID:-//Bandanize//Calendar//EN");
        line(result, "CALSCALE:GREGORIAN");
        line(result, "METHOD:PUBLISH");
        line(result, "X-WR-CALNAME:" + escape(name == null || name.isBlank() ? "Bandanize" : name));
        for (EventModel event : events) {
            Instant modified = event.getUpdatedAt() != null ? event.getUpdatedAt()
                : event.getCreatedAt() != null ? event.getCreatedAt().toInstant(ZoneOffset.UTC) : Instant.EPOCH;
            line(result, "BEGIN:VEVENT");
            line(result, "UID:" + event.getId() + "@bandanize");
            line(result, "DTSTAMP:" + UTC.format(modified));
            line(result, "LAST-MODIFIED:" + UTC.format(modified));
            line(result, "SEQUENCE:" + event.getSequence());
            line(result, "DTSTART:" + UTC.format(event.getDate().atZone(ZoneId.of(event.effectiveTimeZone())).toInstant()));
            line(result, "SUMMARY:" + escape(event.getName()));
            if (event.getDescription() != null) line(result, "DESCRIPTION:" + escape(event.getDescription()));
            if (event.getLocation() != null) line(result, "LOCATION:" + escape(event.getLocation()));
            if (event.getType() != null) line(result, "CATEGORIES:" + escape(event.getType()));
            line(result, "END:VEVENT");
        }
        line(result, "END:VCALENDAR");
        return result.toString();
    }

    private static String escape(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\r\n", "\n").replace("\r", "\n")
            .replace("\n", "\\n").replace(",", "\\,").replace(";", "\\;");
    }

    // Fold at 75 UTF-8 octets without splitting a code point.
    private static void line(StringBuilder result, String value) {
        int length = 0;
        for (int offset = 0; offset < value.length();) {
            int cp = value.codePointAt(offset);
            String text = new String(Character.toChars(cp));
            int bytes = text.getBytes(StandardCharsets.UTF_8).length;
            if (length + bytes > 75) { result.append("\r\n "); length = 1; }
            result.append(text); length += bytes; offset += Character.charCount(cp);
        }
        result.append("\r\n");
    }
}
