import React from 'react';
import { ChordDefinition } from './chordData';

interface ChordDiagramProps {
  chord: ChordDefinition;
}

/**
 * Compact SVG chord diagram showing fingering on a 6-string fretboard.
 * Renders 4 frets, with muted (X) and open (O) string indicators.
 */
export function ChordDiagram({ chord }: ChordDiagramProps) {
  const { name, frets, baseFret = 1 } = chord;

  const numStrings = 6;
  const numFrets = 4;
  const stringSpacing = 16;
  const fretSpacing = 20;
  const paddingLeft = 24;
  const paddingTop = 32;
  const paddingBottom = 8;
  const topIndicatorSpace = 14;

  const gridWidth = (numStrings - 1) * stringSpacing;
  const gridHeight = numFrets * fretSpacing;
  const totalWidth = paddingLeft + gridWidth + 16;
  const totalHeight = paddingTop + topIndicatorSpace + gridHeight + paddingBottom;

  const gridStartX = paddingLeft;
  const gridStartY = paddingTop + topIndicatorSpace;

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="block"
    >
      {/* Chord name */}
      <text
        x={gridStartX + gridWidth / 2}
        y={14}
        textAnchor="middle"
        className="fill-foreground"
        fontSize={14}
        fontWeight="bold"
      >
        {name}
      </text>

      {/* Base fret indicator */}
      {baseFret > 1 && (
        <text
          x={gridStartX - 8}
          y={gridStartY + fretSpacing / 2 + 4}
          textAnchor="end"
          className="fill-muted-foreground"
          fontSize={10}
        >
          {baseFret}fr
        </text>
      )}

      {/* Nut (thick line at top for open position) */}
      {baseFret === 1 && (
        <line
          x1={gridStartX}
          y1={gridStartY}
          x2={gridStartX + gridWidth}
          y2={gridStartY}
          stroke="currentColor"
          strokeWidth={3}
          className="text-foreground"
        />
      )}

      {/* Fret lines */}
      {Array.from({ length: numFrets + 1 }).map((_, i) => (
        <line
          key={`fret-${i}`}
          x1={gridStartX}
          y1={gridStartY + i * fretSpacing}
          x2={gridStartX + gridWidth}
          y2={gridStartY + i * fretSpacing}
          stroke="currentColor"
          strokeWidth={i === 0 && baseFret === 1 ? 0 : 1}
          className="text-border"
        />
      ))}

      {/* String lines */}
      {Array.from({ length: numStrings }).map((_, i) => (
        <line
          key={`string-${i}`}
          x1={gridStartX + i * stringSpacing}
          y1={gridStartY}
          x2={gridStartX + i * stringSpacing}
          y2={gridStartY + gridHeight}
          stroke="currentColor"
          strokeWidth={1}
          className="text-border"
        />
      ))}

      {/* Open / Muted indicators & finger dots */}
      {frets.map((fret, stringIndex) => {
        const x = gridStartX + stringIndex * stringSpacing;

        if (fret === -1) {
          // Muted string: X
          return (
            <text
              key={`ind-${stringIndex}`}
              x={x}
              y={gridStartY - 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight="bold"
              className="fill-muted-foreground"
            >
              ×
            </text>
          );
        }

        if (fret === 0) {
          // Open string: O
          return (
            <circle
              key={`ind-${stringIndex}`}
              cx={x}
              cy={gridStartY - 7}
              r={4}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="text-foreground"
            />
          );
        }

        // Fingered fret: filled circle
        const relativeFret = fret - (baseFret > 1 ? baseFret - 1 : 0);
        const y = gridStartY + (relativeFret - 0.5) * fretSpacing;

        return (
          <circle
            key={`dot-${stringIndex}`}
            cx={x}
            cy={y}
            r={6}
            className="fill-primary"
          />
        );
      })}
    </svg>
  );
}
