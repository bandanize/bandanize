# Mascot audio player

Frontend-only change. No backend deployment or schema migration is needed.

One persistent audio element belongs to the signed-in session. Library rows in songs, tabs and comment attachments start or pause it. Navigation within the app preserves playback. Starting another track replaces the source; playing video pauses audio and vice versa. Close and logout release the source. Nothing autoplays or preloads audio before selection.

The guitar sprite strip animates only on the native playing event. Pause, end, buffering and errors show the seated waiting mascot. The panel includes seek, mute, volume, collapse and close. Reduced-motion preference renders a static playing frame. Dialogs retain their higher layer so the player does not obstruct modal tasks.

Art uses the user's approved beige-skin guitar/flame sheet, created with built-in image_gen, plus a matching seated waiting pose. SVG files are wrappers for the optimized embedded WebP bitmap assets, not redrawn vector substitutes. The playing strip contains eight equal frames; CSS performs discrete 800ms looping without repainting or decoding an animated GIF. Original working files live in outputs/mascot-player in the shared task workspace.

Waiting sprite prompt: same Bandanize punk mascot, warm beige skin #B5A66E, black jagged hair/clothes and red guitar; seated with cheek resting in one hand, half-lidded bored eyes, guitar idle across lap, no fire or sparks, transparent background and matching pixel-art rendering.

Tests run in GitHub Actions only, including actual WAV playback in Chromium/WebKit, state/mascot synchronization, navigation, replacement audio, attachments, end/replay, mute, 320/390px layouts, reduced motion, retry and logout.
