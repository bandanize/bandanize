import { useSeenContent } from '@/contexts/SongUnreadContext';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { File, FileAudio, Film, Image as ImageIcon, Download, Trash2, Plus, Play, ChevronDown } from 'lucide-react';
import { getMediaUrl } from '@/services/api';
import { Button } from '../ui/button';

export interface LibraryFile { url: string; name: string; type: string }
export function MediaLibrary({ songId, activityScope, files, title, onUpload, onDelete, onPreview, uploading = false, progress = 0 }: {
  songId?: string; activityScope?: string;
  files: LibraryFile[]; title: string; onUpload?: () => void; onDelete?: (url: string) => void;
  onPreview: (file: LibraryFile) => void; uploading?: boolean; progress?: number;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const kind = (file: LibraryFile) => file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'document';
  const visible = files.filter(file => filter === 'all' || kind(file) === filter);
  const activityRoot = useRef<HTMLElement>(null);
  useSeenContent(activityRoot, activityScope ? songId : undefined, 'files', JSON.stringify(visible.map(file => file.url)));
  return <section ref={activityRoot} className="rounded-xl border border-border bg-card overflow-hidden min-w-0">
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
      <h3 className="text-sm font-medium">{title} <span className="text-muted-foreground ml-1">{files.length}</span></h3>
      {onUpload && <Button size="sm" variant="outline" disabled={uploading} onClick={onUpload} aria-label={t('workspace.add_file')}><Plus className="size-4" /><span className="hidden sm:inline">{t('workspace.add_file')}</span></Button>}
    </div>
    {uploading && <div className="px-4 py-2 text-xs text-primary" role="status">{t('workspace.uploading')} {progress}%<progress value={progress} max={100} className="w-full h-1 mt-2 accent-lime-400" /></div>}
    {(files.length > 3 || filter !== 'all') && <div className="flex gap-1 overflow-x-auto px-3 py-2 border-b border-border" aria-label={t('workspace.filter_files')}>
      {['all','audio','video','image','document'].map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`shrink-0 text-xs px-2 py-1.5 rounded-md ${filter === value ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent'}`}>{t('workspace.'+value)}</button>)}
    </div>}
    <div data-media-items className="max-h-[380px] overflow-y-auto divide-y divide-border">
      {!visible.length && <p className="px-4 py-5 text-xs text-muted-foreground">{t(files.length ? 'workspace.no_matching_files' : 'workspace.no_files')}</p>}
      {visible.map(file => {
        const type = kind(file); const playable = type === 'audio' || type === 'video';
        const Icon = type === 'audio' ? FileAudio : type === 'video' ? Film : type === 'image' ? ImageIcon : File;
        const open = active === file.url;
        return <div key={file.url} data-seen-key={activityScope ? activityScope + ':' + file.url : undefined} className="px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg p-1 hover:bg-accent" aria-expanded={playable ? open : undefined}
              onClick={() => playable ? setActive(open ? null : file.url) : onPreview(file)}>
              <span className="size-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{playable ? <Play className="size-4" /> : <Icon className="size-4" />}</span>
              <span className="min-w-0"><span className="block truncate text-xs font-medium" title={file.name}>{file.name}</span><span className="block text-[10px] text-muted-foreground mt-0.5">{t('workspace.'+type)}</span></span>
              {playable && <ChevronDown className={`size-3 ml-auto shrink-0 ${open ? 'rotate-180' : ''}`} />}
            </button>
            <a href={getMediaUrl(file.url)} download={file.name} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary" aria-label={`${t('workspace.download')}: ${file.name}`}><Download className="size-4" /></a>
            {onDelete && <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(file.url)} aria-label={`${t('workspace.delete')}: ${file.name}`}><Trash2 className="size-3.5" /></Button>}
          </div>
          {playable && open && <div className="pt-2 pb-1">
            {type === 'audio' ? <audio key={file.url} controls preload="none" src={getMediaUrl(file.url)} className="w-full h-10" aria-label={file.name} onError={() => setFailed(file.url)} />
              : <video key={file.url} controls playsInline preload="metadata" src={getMediaUrl(file.url)} className="w-full max-h-52 rounded-lg" aria-label={file.name} onError={() => setFailed(file.url)} />}
            {failed === file.url && <p role="status" className="text-xs text-muted-foreground mt-2">{t('workspace.media_failed')}</p>}
          </div>}
        </div>;
      })}
    </div>
  </section>;
}
