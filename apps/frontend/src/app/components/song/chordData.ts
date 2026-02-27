/**
 * Guitar chord definitions for the chord diagram hover feature.
 * Each chord includes fret positions for 6 strings (E-A-D-G-B-e):
 *   -1 = muted (X), 0 = open, 1+ = fret number
 * baseFret indicates the starting fret for barre chords (default 1).
 * fingers is optional: 0 = no finger, 1-4 = finger number.
 */

export interface ChordDefinition {
    name: string;
    frets: [number, number, number, number, number, number];
    fingers?: [number, number, number, number, number, number];
    baseFret?: number;
}

export const CHORD_DB: Record<string, ChordDefinition> = {
    // --- Major ---
    C: { name: 'C', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    D: { name: 'D', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    E: { name: 'E', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
    F: { name: 'F', frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
    G: { name: 'G', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
    A: { name: 'A', frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
    B: { name: 'B', frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 1 },

    // --- Minor ---
    Cm: { name: 'Cm', frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], baseFret: 3 },
    Dm: { name: 'Dm', frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
    Em: { name: 'Em', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
    Fm: { name: 'Fm', frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1] },
    Gm: { name: 'Gm', frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], baseFret: 3 },
    Am: { name: 'Am', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
    Bm: { name: 'Bm', frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], baseFret: 1 },

    // --- 7th ---
    C7: { name: 'C7', frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
    D7: { name: 'D7', frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
    E7: { name: 'E7', frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
    F7: { name: 'F7', frets: [1, 3, 1, 2, 1, 1], fingers: [1, 3, 1, 2, 1, 1] },
    G7: { name: 'G7', frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
    A7: { name: 'A7', frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 1, 0, 2, 0] },
    B7: { name: 'B7', frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },

    // --- Minor 7th ---
    Cm7: { name: 'Cm7', frets: [-1, 3, 5, 3, 4, 3], fingers: [0, 1, 3, 1, 2, 1], baseFret: 3 },
    Dm7: { name: 'Dm7', frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
    Em7: { name: 'Em7', frets: [0, 2, 0, 0, 0, 0], fingers: [0, 1, 0, 0, 0, 0] },
    Am7: { name: 'Am7', frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
    Bm7: { name: 'Bm7', frets: [-1, 2, 0, 2, 3, 2], fingers: [0, 1, 0, 2, 4, 3] },

    // --- Major 7th ---
    Cmaj7: { name: 'Cmaj7', frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
    Dmaj7: { name: 'Dmaj7', frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3] },
    Emaj7: { name: 'Emaj7', frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0] },
    Fmaj7: { name: 'Fmaj7', frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
    Gmaj7: { name: 'Gmaj7', frets: [3, 2, 0, 0, 0, 2], fingers: [2, 1, 0, 0, 0, 3] },
    Amaj7: { name: 'Amaj7', frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },

    // --- Sus ---
    Asus2: { name: 'Asus2', frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
    Asus4: { name: 'Asus4', frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
    Dsus2: { name: 'Dsus2', frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
    Dsus4: { name: 'Dsus4', frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3] },
    Esus4: { name: 'Esus4', frets: [0, 2, 2, 2, 0, 0], fingers: [0, 2, 3, 4, 0, 0] },

    // --- Sharps / Flats (common) ---
    'C#': { name: 'C#', frets: [-1, 4, 3, 1, 2, 1], fingers: [0, 4, 3, 1, 2, 1], baseFret: 1 },
    'Db': { name: 'Db', frets: [-1, 4, 3, 1, 2, 1], fingers: [0, 4, 3, 1, 2, 1], baseFret: 1 },
    'F#': { name: 'F#', frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1 },
    'Gb': { name: 'Gb', frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1 },
    'G#': { name: 'G#', frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], baseFret: 4 },
    'Ab': { name: 'Ab', frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], baseFret: 4 },
    'Bb': { name: 'Bb', frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1] },
    'A#': { name: 'A#', frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1] },
    'C#m': { name: 'C#m', frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1], baseFret: 4 },
    'F#m': { name: 'F#m', frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], baseFret: 1 },
    'G#m': { name: 'G#m', frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1], baseFret: 4 },
    'Bbm': { name: 'Bbm', frets: [-1, 1, 3, 3, 2, 1], fingers: [0, 1, 3, 4, 2, 1] },
    'Eb': { name: 'Eb', frets: [-1, -1, 1, 3, 4, 3], fingers: [0, 0, 1, 2, 4, 3] },
    'Ebm': { name: 'Ebm', frets: [-1, -1, 1, 3, 4, 2], fingers: [0, 0, 1, 3, 4, 2] },
};

/**
 * Regex used to detect chord names in tab content.
 * Matches: A-G + optional # or b + optional quality (m, maj, min, dim, aug, sus2, sus4, add9, etc.) + optional extension (7, 9, etc.) + optional bass note (/X)
 * Uses word boundaries to avoid matching inside words.
 */
export const CHORD_REGEX = /(?<![a-zA-Z])([A-G][#b]?(?:m(?:aj|in)?|dim|aug|sus[24]?|add)?[2-9]?(?:\/[A-G][#b]?)?)(?![a-zA-Z\d\-|])/g;
