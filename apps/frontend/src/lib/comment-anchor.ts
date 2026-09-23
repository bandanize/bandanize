export interface CommentAnchor { start: number; end: number; quote: string }

/** Prefer the original position; relocate only when the quote has a unique match. */
export function resolveAnchor(content: string, anchor: CommentAnchor): CommentAnchor | null {
  if (!anchor.quote) return null;
  if (content.slice(anchor.start, anchor.end) === anchor.quote) return anchor;
  const start = content.indexOf(anchor.quote);
  if (start < 0 || content.indexOf(anchor.quote, start + 1) >= 0) return null;
  return { ...anchor, start, end: start + anchor.quote.length };
}
