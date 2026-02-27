import React, { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { CHORD_DB, CHORD_REGEX } from './chordData';
import { ChordDiagram } from './ChordDiagram';
import { cn } from '@/app/components/ui/utils';

interface TabRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders tab content as read-only monospace text with chord names
 * detected and wrapped in hoverable popovers showing chord diagrams.
 */
export function TabRenderer({ content, className }: TabRendererProps) {
  const renderedLines = useMemo(() => {
    return content.split('\n').map((line, lineIdx) => {
      return renderLineWithChords(line, lineIdx);
    });
  }, [content]);

  return (
    <pre
      className={cn(
        'font-mono whitespace-pre-wrap break-words leading-relaxed p-4 bg-background border border-border rounded-md text-foreground overflow-auto',
        className,
      )}
    >
      {renderedLines.map((lineParts, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && '\n'}
          {lineParts}
        </React.Fragment>
      ))}
    </pre>
  );
}

/**
 * Checks if a line looks like a tablature line (e.g. "e|---3---5---|").
 * We skip chord detection on tab lines to avoid false positives.
 */
function isTabLine(line: string): boolean {
  return /^[A-Ga-g#b]?\|[0-9hpbx/\\~|.\s-]*\|?\s*$/.test(line.trim());
}

/**
 * Renders a single line, detecting chord names and wrapping them in popovers.
 */
function renderLineWithChords(line: string, lineIdx: number): React.ReactNode[] {
  // Don't process tablature lines — they contain letters that are fret markers, not chord names
  if (isTabLine(line)) {
    return [line];
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Reset regex lastIndex for each line
  const regex = new RegExp(CHORD_REGEX.source, CHORD_REGEX.flags);

  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    const chordName = match[1];
    const chordDef = CHORD_DB[chordName];

    // Only create a hover if we have a chord definition for it
    if (!chordDef) {
      continue;
    }

    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }

    // Add the chord with popover
    parts.push(
      <ChordPopover
        key={`${lineIdx}-${match.index}`}
        chordName={chordName}
        chord={chordDef}
      />,
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  // If no matches at all, return original line
  if (parts.length === 0) {
    return [line];
  }

  return parts;
}

/**
 * Individual chord popover — hover trigger with chord diagram content.
 */
function ChordPopover({
  chordName,
  chord,
}: {
  chordName: string;
  chord: typeof CHORD_DB[string];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="
            inline font-mono font-bold
            text-primary
            border-b border-dashed border-primary/50
            hover:border-primary hover:text-primary/80
            transition-colors cursor-pointer
            bg-transparent p-0 leading-inherit
          "
        >
          {chordName}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3 bg-card border-border shadow-xl"
        sideOffset={8}
      >
        <ChordDiagram chord={chord} />
      </PopoverContent>
    </Popover>
  );
}
