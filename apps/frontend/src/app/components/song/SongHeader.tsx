import { Button } from '@/app/components/ui/button';
import { ArrowLeft, Trash2, PenLine, MoreHorizontal, Music2, Gauge, AudioLines } from 'lucide-react';
import { Song } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';

interface SongHeaderProps {
  song: Song;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (data: { name: string; originalBand: string; bpm: number | null; key: string }) => Promise<void>;
  onEdit: () => void;
  isSaving: boolean;
}

export function SongHeader({ song, onBack, onDelete, onEdit, isSaving }: SongHeaderProps) {
  const { t } = useTranslation();
  return <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-6" aria-label={t('song_header.label')}>
    <div className="absolute inset-y-0 left-0 w-1 bg-primary/65" />
    <div className="flex items-start gap-3 sm:gap-5 min-w-0">
      <Button variant="ghost" size="icon" onClick={onBack} aria-label={t('song_header.back')} title={t('song_header.back')} className="size-9 shrink-0 text-muted-foreground"><ArrowLeft className="size-4" /></Button>
      <div className="hidden sm:flex size-14 shrink-0 rounded-xl border border-primary/15 bg-primary/10 items-center justify-center text-primary"><Music2 className="size-6" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-primary font-semibold mb-1">{t('song_header.label')}</p>
        <h2 className="font-poppins text-xl sm:text-3xl tracking-tight text-foreground break-words">{song.name}</h2>
        {(song.originalBand || song.bandName) && <p className="text-sm text-muted-foreground mt-1 break-words">{song.originalBand || song.bandName}</p>}
        {(song.bpm || song.key) && <div className="flex flex-wrap gap-2 mt-3">
          {song.bpm && <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-2 py-1 text-xs text-muted-foreground"><Gauge className="size-3.5" /><span className="font-medium text-foreground">{song.bpm}</span> BPM</span>}
          {song.key && <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-2 py-1 text-xs text-muted-foreground" title={t('song_header.key')}><AudioLines className="size-3.5" /><span className="font-medium text-foreground">{song.key}</span></span>}
        </div>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="outline" disabled={isSaving} onClick={onEdit} aria-label={t('edit_info', 'Editar información')} title={t('edit_info', 'Editar información')} className="size-9 sm:w-auto sm:px-3 border-primary/20 bg-primary/5 hover:bg-primary/10">
          <PenLine className="size-4" /><span className="hidden md:inline">{t('edit_info', 'Editar información')}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label={t('song_header.actions')}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive gap-2"><Trash2 className="size-4" />{t('delete_song', 'Eliminar canción')}</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </section>;
}
