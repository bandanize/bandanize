import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { PenLine } from 'lucide-react';
import { Song } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';

interface SongInfoProps {
  song: Song;
  onUpdate: (data: { name: string; originalBand: string; bpm: number | null; key: string }) => Promise<void>;
  isSaving: boolean;
}

export function SongInfo({ song, onUpdate, isSaving }: SongInfoProps) {
  const { t } = useTranslation();
  const [editSongData, setEditSongData] = React.useState({
    name: song.name || '',
    originalBand: song.originalBand || '',
    bpm: song.bpm !== null && song.bpm !== undefined && song.bpm !== 0 ? song.bpm : null,
    key: song.key || '',
  });

  React.useEffect(() => {
    setEditSongData({
      name: song.name || '',
      originalBand: song.originalBand || '',
      bpm: song.bpm !== null && song.bpm !== undefined && song.bpm !== 0 ? song.bpm : null,
      key: song.key || '',
    });
  }, [song]);

  const handleSave = () => {
    onUpdate(editSongData);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-foreground">{t('song_info', 'Información de la canción')}</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-card border-border text-foreground hover:bg-accent">
                <PenLine className="size-4 md:mr-2" />
                <span className="hidden md:inline">{t('edit_info', 'Editar información')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle>{t('edit_info', 'Editar información')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-foreground">{t('name', 'Nombre')}</Label>
                  <Input
                    value={editSongData.name}
                    onChange={(e) => setEditSongData({ ...editSongData, name: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">{t('band', 'Banda')}</Label>
                  <Input
                    value={editSongData.originalBand}
                    placeholder="Ej: The Beatles"
                    onChange={(e) => setEditSongData({ ...editSongData, originalBand: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                    <Label className="text-foreground">{t('bpm', 'BPM')}</Label>
                    <Input
                      type="number"
                      placeholder="Opcional"
                      value={editSongData.bpm === null ? '' : editSongData.bpm}
                      onChange={(e) => {
                            const val = e.target.value;
                            setEditSongData({ ...editSongData, bpm: val === '' ? null : parseInt(val) })
                      }}
                      className="bg-background border-border text-foreground"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-foreground">{t('key', 'Tonalidad')}</Label>
                    <Input
                      value={editSongData.key}
                      onChange={(e) => setEditSongData({ ...editSongData, key: e.target.value })}
                      className="bg-background border-border text-foreground"
                    />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                  <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                      {isSaving ? t('saving', 'Guardando...') : t('save_changes', 'Guardar cambios')}
                  </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          <div>
              <Label className="text-muted-foreground text-sm">{t('name', 'Nombre')}</Label>
              <p className="text-foreground text-lg font-medium mt-1">{song.name}</p>
          </div>
          <div>
              <Label className="text-muted-foreground text-sm">{t('band', 'Banda')}</Label>
              <p className="text-foreground text-lg font-medium mt-1">{song.originalBand || song.bandName || '-'}</p>
          </div>
          {song.bpm !== null && song.bpm !== undefined && song.bpm !== 0 && (
            <div>
                <Label className="text-muted-foreground text-sm">{t('bpm', 'BPM')}</Label>
                <p className="text-foreground text-lg font-medium mt-1">{song.bpm}</p>
            </div>
          )}
          {song.key && (
            <div>
                <Label className="text-muted-foreground text-sm">{t('key', 'Tonalidad')}</Label>
                <p className="text-foreground text-lg font-medium mt-1">{song.key}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
