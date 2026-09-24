import { resolveAnchor, type CommentAnchor } from '@/lib/comment-anchor';
import React, { useMemo, useState, useRef, useLayoutEffect, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import type { TabComment } from './TabComments';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { CHORD_DB, CHORD_REGEX } from './chordData';
import { ChordDiagram } from './ChordDiagram';
import { cn } from '@/app/components/ui/utils';

const EMPTY_COMMENTS: TabComment[] = [];

interface TabRendererProps {
  columns?: boolean;
  highlighted?: CommentAnchor | null;
  comments?: TabComment[];
  content: string;
  className?: string;
}

/**
 * Renders tab content as read-only monospace text with chord names
 * detected and wrapped in hoverable popovers showing chord diagrams.
 */
export function TabRenderer({ content, className, highlighted, comments = EMPTY_COMMENTS, columns = false }: TabRendererProps) {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [positions, setPositions] = useState<{ id: number; top: number; left: number; above: boolean }[]>([]);
  const annotated = useMemo(() => comments.flatMap(comment => {
    const anchor = resolveAnchor(content, { start: comment.anchorStart ?? -1, end: comment.anchorEnd ?? -1, quote: comment.quote || '' });
    return anchor ? [{ comment, anchor }] : [];
  }), [comments, content]);
  const [hoveredQuote, setHoveredQuote] = useState<CommentAnchor | null>(null);
  const activeNote = annotated.find(item => item.comment.id === active);
  const shownAnchor = activeNote ? hoveredQuote || activeNote.anchor : highlighted;
  useEffect(() => {
    const clear = (event: PointerEvent) => { if (!(event.target instanceof Element) || !event.target.closest('[data-comment-marker]')) setActive(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setActive(null); };
    document.addEventListener('pointerdown', clear); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', clear); document.removeEventListener('keydown', escape); };
  }, []);
  useLayoutEffect(() => {
    const pre = preRef.current; const container = host.current;
    if (!pre || !container) return;
    const measure = () => {
      const origin = container.getBoundingClientRect();
      const scaleX = origin.width / container.offsetWidth || 1;
      const scaleY = origin.height / container.offsetHeight || 1;
      const taken = new Set<string>();
      const style = getComputedStyle(pre);
      const count = Number.parseInt(style.columnCount) || 1;
      const gap = Number.parseFloat(style.columnGap) || 0;
      const padding = Number.parseFloat(style.paddingLeft) || 0;
      const innerWidth = pre.clientWidth - padding - (Number.parseFloat(style.paddingRight) || 0);
      const step = (innerWidth - gap * (count - 1)) / count + gap;
      const preBounds = pre.getBoundingClientRect();
      setPositions(annotated.flatMap(({ comment, anchor }) => {
        const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
        let node: Node | null; let offset = 0;
        while ((node = walker.nextNode())) {
          const length = node.textContent?.length || 0;
          if (offset + length > anchor.start) {
            const range = document.createRange();
            range.setStart(node, anchor.start - offset); range.setEnd(node, Math.min(length, anchor.start - offset + 1));
            const rect = range.getBoundingClientRect();
            const top = (rect.top - origin.top) / scaleY;
            if (top < 0 || top > container.clientHeight - 20) return [];
            // One marker per visual row; its preview includes every comment on that row.
            const column = count > 1 ? Math.max(0, Math.floor(((rect.left - preBounds.left) / scaleX + pre.scrollLeft - padding + 2) / step)) : 0;
            const left = count > 1 ? (preBounds.left - origin.left) / scaleX + padding + column * step - pre.scrollLeft - 32 : 4;
            if (left < 0 || left + 24 > container.clientWidth) return [];
            const row = Math.round(top) + ':' + column;
            if (taken.has(row)) return [];
            taken.add(row);
            return [{ id: comment.id, top, left, above: top > container.clientHeight - 240 }];
          }
          offset += length;
        }
        return [];
      }));
    };
    const observer = new ResizeObserver(measure); observer.observe(pre);
    pre.addEventListener('scroll', measure); measure();
    return () => { observer.disconnect(); pre.removeEventListener('scroll', measure); };
  }, [annotated, className, shownAnchor, columns]);


  useEffect(() => {
    const pre = preRef.current;
    if (!pre || !columns) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)
          || !(Number.parseInt(getComputedStyle(pre).columnCount) >= 2)
          || pre.scrollWidth <= pre.clientWidth + 1) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? pre.clientWidth : 1;
      pre.scrollLeft += event.deltaY * scale;
    };
    pre.addEventListener('wheel', wheel, { passive: false });
    return () => pre.removeEventListener('wheel', wheel);
  }, [columns]);

  const renderedLines = useMemo(() => {
    const lines: { parts: React.ReactNode[]; start: number; end: number }[] = [];
    let offset = 0;
    for (const [index, line] of content.split('\n').entries()) {
      lines.push({ parts: renderLineWithChords(line, index), start: offset, end: offset + line.length });
      offset += line.length + 1;
    }
    return lines;
  }, [content]);

  return (
    <div ref={host} className="relative min-w-0 h-full min-h-0">
    <pre ref={preRef}
      tabIndex={columns ? 0 : undefined}
      onKeyDown={event => {
        const pre = event.currentTarget;
        if (!columns || event.target !== pre || event.ctrlKey || event.metaKey || event.altKey
            || !(Number.parseInt(getComputedStyle(pre).columnCount) >= 2)) return;
        const delta = { ArrowDown: 48, ArrowUp: -48, PageDown: pre.clientWidth * 0.9, PageUp: -pre.clientWidth * 0.9 }[event.key];
        if (delta !== undefined) { event.preventDefault(); pre.scrollLeft += delta; }
        else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); pre.scrollLeft = event.key === 'Home' ? 0 : pre.scrollWidth; }
      }}
      className={cn(
        'font-mono whitespace-pre-wrap break-words max-sm:break-all leading-relaxed p-4 bg-background border border-border rounded-md text-foreground overflow-auto',
        className,
        columns && 'tab-reader-columns',
      )}
      style={annotated.length ? { paddingLeft: 36 } : undefined}
    >
      {renderedLines.map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && '\n'}
          <span data-anchor-line={!!shownAnchor && line.start < shownAnchor.end && line.end > shownAnchor.start}>
            {highlightParts(line.parts, line.start, shownAnchor)}
          </span>
        </React.Fragment>
      ))}
    </pre>
    {positions.map(position => {
      const note = annotated.find(item => item.comment.id === position.id);
      if (!note) return null;
      const siblings = annotated.filter(item => content.slice(0, item.anchor.start).split('\n').length === content.slice(0, note.anchor.start).split('\n').length);
      return <div key={position.id} data-comment-marker data-comment-marker-id={position.id} className="absolute z-20" style={{ top: position.top, left: position.left }}
        onMouseEnter={() => { setHoveredQuote(null); setActive(position.id); }} onMouseLeave={() => { setActive(null); setHoveredQuote(null); }}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setActive(null); }}>
        <button type="button" aria-label={t('comments_ui.marker', { count: siblings.length })} aria-expanded={active === position.id}
          className="size-6 flex items-center justify-center rounded-md text-primary/65 hover:text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-primary"
          onFocus={() => setActive(position.id)} onClick={() => setActive(position.id)}>
          <MessageCircle className="size-3.5" />
        </button>
        {active === position.id && <div role="dialog" aria-label={t('comments', 'Comments')}
          style={position.above ? { bottom: 0 } : { top: 0 }}
          className="absolute left-6 w-56 max-w-[calc(100vw-80px)] max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-3 shadow-xl text-xs space-y-3"
          onKeyDown={event => { if (event.key === 'Escape') setActive(null); }}>
          {siblings.map(({ comment, anchor }) => <div key={comment.id} onMouseEnter={() => setHoveredQuote(anchor)}>
            <p className="font-medium text-foreground">{comment.sender?.name || t('deleted_user', 'Usuario eliminado')}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-foreground">{comment.message || t('workspace.attachments')}</p>
            <blockquote className="mt-2 border-l-2 border-primary/50 pl-2 font-mono text-primary whitespace-pre-wrap break-all line-clamp-3">{anchor.quote}</blockquote>
          </div>)}
        </div>}
      </div>;
    })}
    </div>
  );
}


function highlightParts(parts: React.ReactNode[], start: number, anchor?: CommentAnchor | null) {
  let offset = start;
  return parts.flatMap((part, index) => {
    const text = typeof part === 'string' ? part : React.isValidElement<{ chordName: string }>(part) ? part.props.chordName : '';
    const from = Math.max(0, (anchor?.start ?? -1) - offset);
    const to = Math.min(text.length, (anchor?.end ?? -1) - offset);
    offset += text.length;
    if (!anchor || to <= from) return [part];
    const highlight = (child: React.ReactNode) => <mark key={'highlight-' + index} className="bg-primary/20 text-inherit rounded-sm outline outline-1 outline-primary/30">{child}</mark>;
    return typeof part === 'string' ? [text.slice(0, from), highlight(text.slice(from, to)), text.slice(to)] : [highlight(part)];
  });
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
          style={{ fontSize: 'inherit' }}
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
