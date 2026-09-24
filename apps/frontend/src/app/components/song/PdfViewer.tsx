import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Minus, Plus, ScanLine, Download, ExternalLink, LoaderCircle } from 'lucide-react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getMediaUrl } from '@/services/api';
import type { MediaFile } from '@/lib/media-kind';

GlobalWorkerOptions.workerSrc = workerUrl;
export default function PdfViewer({ file }: { file: MediaFile }) {
  const { t } = useTranslation();
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(600);
  const [rendered, setRendered] = useState('');
  const [text, setText] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const url = getMediaUrl(file.url);
  const renderKey = page + ':' + width + ':' + zoom;
  useEffect(() => {
    const loading = getDocument({ url, isEvalSupported: false,
      cMapUrl: '/pdf-assets/cmaps/', cMapPacked: true,
      standardFontDataUrl: '/pdf-assets/standard_fonts/', wasmUrl: '/pdf-assets/wasm/' });
    let active = true;
    void loading.promise.then(pdf => { if (active) setDocument(pdf); }).catch(reason => {
      if (active) setError(reason?.name === 'PasswordException' ? 'protected_pdf' : 'pdf_failed');
    });
    return () => { active = false; void loading.destroy(); };
  }, [url]);
  useEffect(() => {
    const element = area.current; if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(180, Math.floor(entries[0].contentRect.width))));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let cancelled = false;
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    void document.getPage(page).then(async pdfPage => {
      if (cancelled || !canvas.current) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: Math.max(0.1, (width - 24) / base.width) * zoom });
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(16000000 / (viewport.width * viewport.height)));
      const element = canvas.current;
      element.width = Math.ceil(viewport.width * ratio); element.height = Math.ceil(viewport.height * ratio);
      element.style.width = viewport.width + 'px'; element.style.height = viewport.height + 'px';
      render = pdfPage.render({ canvas: element, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      await render.promise;
      if (cancelled) return;
      setRendered(renderKey);
      const content = await pdfPage.getTextContent();
      if (!cancelled) setText(content.items.map(item => 'str' in item ? item.str : '').join(' '));
    }).catch(reason => { if (!cancelled && reason?.name !== 'RenderingCancelledException') setError('pdf_failed'); });
    return () => { cancelled = true; render?.cancel(); };
  }, [document, page, width, zoom, renderKey]);
  const changePage = (value: number) => {
    if (!document || !Number.isFinite(value)) return;
    setPage(Math.max(1, Math.min(document.numPages, Math.trunc(value))));
    area.current?.scrollTo({ top: 0, left: 0 });
  };
  const button = 'inline-flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-primary disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-primary';
  return <section data-pdf-viewer className="w-full min-w-0 rounded-xl border border-border overflow-hidden bg-background" aria-label={file.name}>
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border bg-card p-2">
      <div className="flex items-center gap-1">
        <button type="button" className={button} disabled={!document || page <= 1} onClick={() => changePage(page-1)} aria-label={t('media_viewer.previous_page')}><ChevronLeft size={18} /></button>
        <input type="number" min={1} max={document?.numPages || 1} value={page} disabled={!document}
          onChange={event => changePage(Number(event.target.value))} aria-label={t('media_viewer.page')}
          className="w-12 h-8 rounded-md bg-secondary border border-border text-center text-xs tabular-nums" />
        <span className="text-xs text-muted-foreground tabular-nums">/ {document?.numPages || '—'}</span>
        <button type="button" className={button} disabled={!document || page >= document.numPages} onClick={() => changePage(page+1)} aria-label={t('media_viewer.next_page')}><ChevronRight size={18} /></button>
      </div>
      <div className="flex items-center gap-0.5">
        <button type="button" className={button} disabled={!document || zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5,value-0.25))} aria-label={t('media_viewer.zoom_out')}><Minus size={16} /></button>
        <span className="text-[11px] tabular-nums text-muted-foreground w-9 text-center">{Math.round(zoom*100)}%</span>
        <button type="button" className={button} disabled={!document || zoom >= 3} onClick={() => setZoom(value => Math.min(3,value+0.25))} aria-label={t('media_viewer.zoom_in')}><Plus size={16} /></button>
        <button type="button" className={button} disabled={!document} onClick={() => setZoom(1)} aria-label={t('media_viewer.fit_width')} title={t('media_viewer.fit_width')}><ScanLine size={16} /></button>
      </div>
      <div className="flex">
        <a href={url} target="_blank" rel="noopener noreferrer" className={button} aria-label={t('media_viewer.open_original')}><ExternalLink size={16} /></a>
        <a href={url} download={file.name} target="_blank" rel="noopener noreferrer" className={button} aria-label={t('workspace.download')}><Download size={16} /></a>
      </div>
    </div>
    <div ref={area} className="relative overflow-auto h-[65dvh] min-h-48 bg-[#282a2d] p-3" aria-busy={!error && rendered !== renderKey}>
      {error ? <div role="alert" className="h-full flex items-center justify-center text-center p-6 text-sm text-muted-foreground">{t('media_viewer.'+error)}</div>
        : <><div className="w-fit mx-auto shadow-lg"><canvas ref={canvas} data-pdf-page={page} role="img"
            aria-label={t('media_viewer.page') + ' ' + page + ': ' + file.name} className={rendered === renderKey ? 'block bg-white' : 'block bg-white opacity-30'} /></div>
          {rendered !== renderKey && <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white"><LoaderCircle className="size-5 animate-spin text-primary" />{t('loading')}</div>}
          <p className="sr-only">{text}</p></>}
    </div>
  </section>;
}
