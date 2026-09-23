import { createPortal } from 'react-dom';
import { PassagePicker } from './PassagePicker';
import { MediaLibrary } from './MediaLibrary';
import type { CommentAnchor } from '@/lib/comment-anchor';
import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { 
  Guitar, Music2, Music, Save, Download, FileText, MessageSquarePlus, 
  Eye, Pencil,
  Maximize, Minimize, ZoomIn, ZoomOut
} from 'lucide-react';
import { TabRenderer } from './TabRenderer';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Tablature } from '@/contexts/ProjectContext';
import { INSTRUMENTS } from './constants';
import { cn } from '@/app/components/ui/utils';

function TablatureControls({ onInsert }: { onInsert: (text: string) => void }) {
  const { t } = useTranslation();
  const guitarStrings = 'e|---\nB|---\nG|---\nD|---\nA|---\nE|---\n';
  const bassStrings = 'G|---\nD|---\nA|---\nE|---\n';

  const symbols = [
    { label: 'h', desc: 'Hammer-on', value: 'h' },
    { label: 'p', desc: 'Pull-off', value: 'p' },
    { label: 'b', desc: 'Bend', value: 'b' },
    { label: '/', desc: 'Slide up', value: '/' },
    { label: '\\', desc: 'Slide down', value: '\\' },
    { label: '~', desc: 'Vibrato', value: '~' },
    { label: 'x', desc: 'Mute', value: 'x' },
    { label: '|', desc: 'Barra', value: '|' },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div>
        <Label className="text-sm font-medium mb-3 block text-foreground">{t('string_templates', 'Plantillas de cuerdas')}</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert(guitarStrings)}
            className="bg-card border-border text-foreground hover:bg-accent"
          >
            <Guitar className="size-4 mr-2" />
            {t('guitar_6', 'Guitarra (6 cuerdas)')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert(bassStrings)}
            className="bg-card border-border text-foreground hover:bg-accent"
          >
            <Music2 className="size-4 mr-2" />
            {t('bass_4', 'Bajo (4 cuerdas)')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onInsert('---')}
            className="bg-card border-border text-foreground hover:bg-accent"
          >
            {t('simple_line', 'Línea simple')}
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block text-foreground">{t('symbols_techniques', 'Símbolos y técnicas')}</Label>
        <div className="flex gap-2 flex-wrap">
          {symbols.map((symbol) => (
            <Button
              key={symbol.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onInsert(symbol.value)}
              title={symbol.desc}
              className="bg-card border-border text-foreground hover:bg-accent min-w-[32px]"
            >
              {symbol.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TabEditorProps {
  onAnnotate?: (anchor: CommentAnchor) => void;
  focusedAnchor?: CommentAnchor | null;
  uploading?: boolean;
  uploadProgress?: number;
  tab: Tablature;
  songName: string;
  onSave: (content: string) => Promise<void>;
  isSaving: boolean;
  onUpload: (tabId: string) => void;
  onDeleteFile: (tabId: string, fileUrl: string) => void;
  onPreview: (file: { url: string; type: string; name: string }) => void;
}

export function TabEditor({ 
  tab, 
  songName, 
  onSave, 
  isSaving, 
  onUpload, 
  onDeleteFile,
  onPreview, onAnnotate, focusedAnchor, uploading, uploadProgress
}: TabEditorProps) {
  const { t } = useTranslation();
  const [editingContent, setEditingContent] = useState(tab.content || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('view');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionHost, setSelectionHost] = useState<Element | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ left: number; top: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<CommentAnchor | null>(null);
  
  const fontSizes = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // Default to text-sm

  const hasChanges = editingContent !== (tab.content || '');

  const increaseFontSize = () => {
    setFontSizeIndex((prev) => Math.min(prev + 1, fontSizes.length - 1));
  };

  const decreaseFontSize = () => {
    setFontSizeIndex((prev) => Math.max(prev - 1, 0));
  };

  const toggleFullscreen = () => setIsFullscreen(previous => !previous);

  const handleInsertText = (text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = editingContent;
    
    const newContent = 
      currentContent.substring(0, start) + 
      text + 
      currentContent.substring(end);
    
    setEditingContent(newContent);
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + text.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const getInstrumentIcon = (iconName: string) => {
    const instrument = INSTRUMENTS.find(i => i.value === iconName);
    const Icon = instrument?.icon || Music;
    return <Icon className="size-4" />;
  };

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(editingContent);
      toast.success(t('reader.copied'));
    } catch { toast.error(t('reader.copy_failed')); }
  };

  const exportContent = () => {
    const blob = new Blob([tab.name + '\n' + (tab.tuning || 'Standard') + '\n\n' + editingContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = songName + '-' + tab.name + '.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  useEffect(() => {
    const capture = () => {
      const container = contentRef.current;
      if (!container) return;
      let start: number, end: number;
      let bounds: DOMRect | undefined;
      if (viewMode === 'edit' && document.activeElement === textareaRef.current) {
        start = textareaRef.current?.selectionStart || 0; end = textareaRef.current?.selectionEnd || 0;
        bounds = textareaRef.current?.getBoundingClientRect();
      } else {
        const selected = window.getSelection(); const pre = container.querySelector('pre');
        if (!selected?.rangeCount || !pre) return;
        const range = selected.getRangeAt(0);
        if (!pre.contains(range.startContainer) || !pre.contains(range.endContainer)) { setSelection(null); setSelectionPosition(null); return; }
        const before = range.cloneRange(); before.selectNodeContents(pre); before.setEnd(range.startContainer, range.startOffset);
        start = before.toString().length; end = start + range.toString().length;
        bounds = range.getBoundingClientRect();
      }
      setSelectionHost(container.closest('[role="dialog"]') || document.body);
      setSelectionPosition(bounds && bounds.bottom > 0 && bounds.top < window.innerHeight ? { left: Math.max(115, Math.min(window.innerWidth - 115, bounds.left + bounds.width / 2)), top: Math.max(8, bounds.top - 44) } : null);
      setSelection(end > start && end - start <= 2000 ? { start, end, quote: editingContent.slice(start, end) } : null);
    };
    document.addEventListener('selectionchange', capture);
    window.addEventListener('scroll', capture, true);
    window.addEventListener('resize', capture);
    return () => { document.removeEventListener('selectionchange', capture); window.removeEventListener('scroll', capture, true); window.removeEventListener('resize', capture); };
  }, [editingContent, viewMode, isFullscreen]);

  useEffect(() => {
    if (!focusedAnchor) return;
    const timer = setTimeout(() => {
      if (textareaRef.current) { textareaRef.current.focus(); textareaRef.current.setSelectionRange(focusedAnchor.start, focusedAnchor.end); }
      else contentRef.current?.querySelector('[data-anchor-line="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 0);
    return () => clearTimeout(timer);
  }, [focusedAnchor]);

  const editor = (
    <div 
        className={cn(
            isFullscreen ? "flex flex-col h-full min-h-0 gap-0 bg-background" : "space-y-4"
        )}
    >
      {isFullscreen && <div className="flex shrink-0 items-center gap-1 border-b border-border px-1 py-1" role="toolbar" aria-label={t('reader.controls')}>
        <span className="hidden sm:block truncate max-w-52 text-sm mr-auto" title={tab.name}>{tab.name}</span>
        <select aria-label={t('reader.font_size')} value={fontSizeIndex} onChange={event => setFontSizeIndex(Number(event.target.value))}
          className="bg-card border border-border rounded-md text-sm h-10 px-1">
          {[12, 14, 16, 18, 20].map((size, index) => <option key={size} value={index}>{size} px</option>)}
        </select>
        <Button variant="ghost" size="icon" className="size-10 shrink-0" onClick={() => setViewMode(mode => mode === 'view' ? 'edit' : 'view')}
          aria-label={viewMode === 'view' ? t('reader.edit') : t('reader.view')} title={viewMode === 'view' ? t('reader.edit') : t('reader.view')}>
          {viewMode === 'view' ? <Pencil className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="size-10 shrink-0" onClick={copyContent} aria-label={t('reader.copy')} title={t('reader.copy')}><FileText className="size-4" /></Button>
        <Button variant="ghost" size="icon" className="size-10 shrink-0" onClick={exportContent} aria-label={t('reader.export')} title={t('reader.export')}><Download className="size-4" /></Button>
        {hasChanges && <Button size="icon" className="size-10 shrink-0" onClick={() => onSave(editingContent)} disabled={isSaving} aria-label={t(isSaving ? 'saving' : 'reader.save')} title={t('reader.save')}><Save className="size-4" /></Button>}
        <Button variant="outline" size="icon" className="size-10 shrink-0 ml-auto" onClick={toggleFullscreen} aria-label={t('exit_fullscreen')} title={t('exit_fullscreen')}><Minimize className="size-4" /></Button>
      </div>}
      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0", isFullscreen && "hidden")}>
        {/* ... (Start of header remains same) */}
        <div className="flex flex-wrap items-center gap-2">
            {getInstrumentIcon(tab.instrumentIcon || 'guitar')}
            <h3 className="font-medium text-foreground text-lg truncate max-w-[200px] sm:max-w-none">{tab.name}</h3>
            <span className="text-xs sm:text-sm text-foreground/60 px-2 py-0.5 bg-accent/50 rounded whitespace-nowrap">
                {tab.tuning || 'Standard'}
            </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-card border border-border rounded-md mr-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none hover:bg-accent"
                    onClick={decreaseFontSize}
                    disabled={fontSizeIndex === 0}
                    title={t('decrease_font_size', 'Disminuir tamaño de letra')}
                >
                    <ZoomOut className="size-4" />
                </Button>
                <select aria-label={t('reader.font_size')}
                  value={fontSizeIndex} onChange={event => setFontSizeIndex(Number(event.target.value))}
                  className="bg-card text-foreground text-sm h-8 px-1 rounded">
                  {[12, 14, 16, 18, 20].map((size, index) => <option key={size} value={index}>{size} px</option>)}
                </select>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none hover:bg-accent"
                    onClick={increaseFontSize}
                    disabled={fontSizeIndex === fontSizes.length - 1}
                    title={t('increase_font_size', 'Aumentar tamaño de letra')}
                >
                    <ZoomIn className="size-4" />
                </Button>
            </div>

            <Button
                variant="outline"
                size="sm"
                className={cn(
                    "flex-1 sm:flex-none border-border hover:bg-accent",
                    viewMode === 'view'
                        ? 'bg-primary/15 text-primary border-primary/30'
                        : 'bg-card text-foreground'
                )}
                onClick={() => setViewMode(prev => prev === 'edit' ? 'view' : 'edit')}
                title={viewMode === 'edit' ? t('reader.view', 'Ver acordes') : t('reader.edit', 'Editar tablatura')}
            >
                {viewMode === 'edit' ? <Eye className="size-4 mr-2" /> : <Pencil className="size-4 mr-2" />}
                <span className="hidden sm:inline">{viewMode === 'edit' ? t('view', 'Ver') : t('edit', 'Editar')}</span>
            </Button>

            <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none bg-card border-border text-foreground hover:bg-accent"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? t('exit_fullscreen', 'Salir de pantalla completa') : t('fullscreen', 'Pantalla completa')}
                title={isFullscreen ? t('exit_fullscreen', 'Salir de pantalla completa') : t('fullscreen', 'Pantalla completa')}
            >
                {isFullscreen ? <Minimize className="size-4 mr-2" /> : <Maximize className="size-4 mr-2" />}
                <span className="hidden sm:inline">{isFullscreen ? t('exit_fullscreen', 'Salir') : t('fullscreen', 'Fullscreen')}</span>
            </Button>

            {hasChanges && (
                <Button 
                    size="sm" 
                    onClick={() => onSave(editingContent)} 
                    disabled={isSaving}
                    className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    <Save className="size-4 mr-2" />
                    <span className="truncate">{isSaving ? t('saving', 'C...') : t('reader.save', 'Guardar')}</span>
                </Button>
            )}
            <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none bg-card border-border text-foreground hover:bg-accent"
                onClick={() => {
                    const text = `${tab.name}\n${tab.tuning || 'Standard'}\n\n${editingContent}`;
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${songName}-${tab.name}.txt`;
                    a.click();
                }}
            >
                <Download className="size-4 mr-2" />
                {t('reader.export', 'Exportar')}
            </Button>
        </div>
      </div>

      {onAnnotate && <div className="flex flex-wrap shrink-0 items-center gap-2 p-1">
        <PassagePicker content={editingContent} disabled={hasChanges} onChoose={anchor => { setSelection(null); setIsFullscreen(false); onAnnotate(anchor); }} />
        
        {hasChanges && <span className="text-xs text-muted-foreground">{t('workspace.save_before_comment')}</span>}
      </div>}

      {selection && selectionPosition && selectionHost && onAnnotate && !hasChanges && createPortal(
        <div className="contents"><Button type="button" size="sm" className="fixed z-[100] shadow-lg -translate-x-1/2 pointer-events-auto" style={selectionPosition}
          onPointerDown={event => event.preventDefault()} onMouseDown={event => event.preventDefault()}
          onClick={() => { const chosen = selection; setSelection(null); setIsFullscreen(false); onAnnotate(chosen); }}>
          <MessageSquarePlus className="size-4" />{t('workspace.comment_selection')}
        </Button></div>, selectionHost)}
      <div ref={contentRef} className={cn("relative", isFullscreen && "flex-1 min-h-0 overflow-hidden")}>
          <div className={cn("absolute top-2 right-2 flex gap-1 z-10", isFullscreen && "hidden")}>
              <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => {
                      navigator.clipboard.writeText(editingContent);
                      toast.success("Copiado al portapapeles");
                  }}
                  title={t('reader.copy', "Copiar")}
              >
                  <FileText className="size-4" />
              </Button>
          </div>
          {viewMode === 'view' ? (
            <TabRenderer
              content={editingContent}
              highlighted={focusedAnchor}
              className={cn(
                "min-h-[400px]",
                fontSizes[fontSizeIndex],
                isFullscreen && "h-full min-h-0 w-full rounded-none border-0 p-2 whitespace-pre break-normal overflow-auto leading-snug"
              )}
            />
          ) : (
            <Textarea
              ref={textareaRef}
              style={{ fontSize: [12, 14, 16, 18, 20][fontSizeIndex] }}
              value={editingContent}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingContent(e.target.value)}
              className={cn(
                  "font-mono min-h-[400px] bg-background border-border text-foreground resize-none leading-relaxed p-4",
                  fontSizes[fontSizeIndex],
                  isFullscreen && "h-full min-h-0 w-full rounded-none border-0 p-2 whitespace-pre break-normal overflow-auto leading-snug"
              )}
              placeholder={t('tab_content_placeholder', "Escribe o pega aquí tu tablatura...\n\ne|---\nB|---\nG|---\nD|---\nA|---\nE|---\n")}
              spellCheck={false}
            />
          )}
      </div>

      {!isFullscreen && viewMode === 'edit' && <TablatureControls onInsert={handleInsertText} />}

      {!isFullscreen && <MediaLibrary files={tab.files || []} title={t('workspace.tab_files')} onUpload={() => onUpload(tab.id)}
        onDelete={url => onDeleteFile(tab.id, url)} onPreview={onPreview} uploading={uploading} progress={uploadProgress} />}

    </div>
  );
  return isFullscreen ? (
    <Dialog open onOpenChange={setIsFullscreen}>
      <DialogContent aria-describedby={undefined}
        style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100dvh',
          padding: 'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
        }}
        className="flex flex-col max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">{tab.name}</DialogTitle>
        {editor}
      </DialogContent>
    </Dialog>
  ) : editor;
}
