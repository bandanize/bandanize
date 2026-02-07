import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ArrowLeft, Trash2, PenLine } from 'lucide-react';
import { Song } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';

interface SongHeaderProps {
  song: Song;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (data: { name: string; originalBand: string; bpm: number | null; key: string }) => Promise<void>;
  onEdit: () => void;
  isSaving: boolean;
}



export function SongHeader({ song, onBack, onDelete, onEdit }: SongHeaderProps) {
  const { t } = useTranslation();

  return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <Button variant="ghost" onClick={onBack} className="text-foreground hover:bg-accent">
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <CardTitle className="text-2xl text-foreground">{song.name}</CardTitle>
                <p className="text-muted-foreground mt-1">
                  {song.originalBand || song.bandName}
                  {song.bpm ? ` • ${song.bpm} BPM` : ''}
                  {song.key ? ` • ${song.key}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline"
                    className="bg-card hover:bg-accent text-foreground border-border"
                    onClick={onEdit}
                >
                    <PenLine className="size-4 md:mr-2" />
                    <span className="hidden md:inline">{t('edit_info', 'Editar información')}</span>
                </Button>
                <Button 
                variant="destructive"
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                onClick={onDelete}
                >
                <Trash2 className="size-4 md:mr-2" />
                <span className="hidden md:inline">{t('delete_song', 'Eliminar canción')}</span>
                </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
  );
}
