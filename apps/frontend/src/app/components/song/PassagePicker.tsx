import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CommentAnchor } from '@/lib/comment-anchor';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

export function PassagePicker({ content, disabled, onChoose }: { content: string; disabled: boolean; onChoose: (anchor: CommentAnchor) => void }) {
  const { t } = useTranslation();
  const choosing = useRef(false);
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState<number | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const lines: { text: string; start: number }[] = [];
  let offset = 0;
  for (const text of content.split('\n')) { lines.push({ text, start: offset }); offset += text.length + 1; }
  const low = first === null ? null : Math.min(first, last ?? first);
  const high = first === null ? null : Math.max(first, last ?? first);
  const start = low === null ? 0 : lines[low].start;
  const end = high === null ? 0 : lines[high].start + lines[high].text.length;
  const quote = content.slice(start, end);
  const valid = first !== null && quote.trim().length > 0 && quote.length <= 2000;
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (value) { choosing.current = false; setFirst(null); setLast(null); } }}>
    <DialogTrigger asChild><Button type="button" variant="outline" size="sm" disabled={disabled || !content.trim()}><MessageSquarePlus className="size-4" />{t('comments_ui.choose_part')}</Button></DialogTrigger>
    <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col" onCloseAutoFocus={event => { if (choosing.current) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>{t('comments_ui.choose_part')}</DialogTitle><DialogDescription>{t('comments_ui.choose_help')}</DialogDescription></DialogHeader>
      <div className="min-h-0 overflow-y-auto border border-border rounded-lg" aria-label={t('comments_ui.lines')}>
        {lines.map((line, index) => <button key={index} type="button" aria-pressed={low !== null && index >= low && index <= high!} aria-label={t('comments_ui.line', { number: index + 1, text: line.text })}
          className={`flex w-full gap-3 text-left px-3 py-2 min-h-11 font-mono text-sm border-b border-border/40 last:border-0 ${low !== null && index >= low && index <= high! ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}
          onClick={() => { if (first === null || last !== null) { setFirst(index); setLast(null); } else setLast(index); }}>
          <span className="w-7 shrink-0 text-muted-foreground text-xs pt-0.5" aria-hidden="true">{index + 1}</span><span className="whitespace-pre-wrap break-all">{line.text || '\u00a0'}</span>
        </button>)}
      </div>
      <p role="status" className="text-xs text-muted-foreground">{quote.length > 2000 ? t('comments_ui.too_long') : first === null ? t('comments_ui.pick_first') : t('comments_ui.chosen', { first: low! + 1, last: high! + 1 })}</p>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>{t('workspace.cancel')}</Button><Button disabled={!valid} onClick={() => { choosing.current = true; setOpen(false); onChoose({ start, end, quote }); }}>{t('comments_ui.use_part')}</Button></div>
    </DialogContent>
  </Dialog>;
}
