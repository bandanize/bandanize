import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Song } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';

interface SongHeaderProps {
  song: Song;
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (data: { name: string; originalBand: string; bpm: number | null; key: string }) => Promise<void>;
  isSaving: boolean;
}

export function SongHeader({ song, onBack, onDelete }: SongHeaderProps) {
  const { t } = useTranslation();


  return (

      <Card className="bg-[#151518] border-[#2B2B31]">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Button variant="ghost" onClick={onBack} className="text-[#EDEDED] hover:bg-[#2B2B31]">
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <CardTitle className="text-2xl text-[#EDEDED]">{song.name}</CardTitle>
                <p className="text-[#EDEDED]/60 mt-1">
                  {song.originalBand || song.bandName}
                  {song.bpm ? ` • ${song.bpm} BPM` : ''}
                  {song.key ? ` • ${song.key}` : ''}
                </p>
              </div>
            </div>
            <Button 
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={onDelete}
            >
              <Trash2 className="size-4 md:mr-2" />
              <span className="hidden md:inline">{t('delete_song', 'Eliminar canción')}</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

  );
}
