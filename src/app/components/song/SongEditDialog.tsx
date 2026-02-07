import React from 'react';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Song } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';

interface SongEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: Song;
  onUpdate: (data: { name: string; originalBand: string; bpm: number | null; key: string }) => Promise<void>;
  isSaving: boolean;
}

export function SongEditDialog({ open, onOpenChange, song, onUpdate, isSaving }: SongEditDialogProps) {
  const { t } = useTranslation();
  const [editSongData, setEditSongData] = React.useState({
    name: song.name || '',
    originalBand: song.originalBand || '',
    bpm: song.bpm !== null && song.bpm !== undefined && song.bpm !== 0 ? song.bpm : null,
    key: song.key || '',
  });

  React.useEffect(() => {
    if (open) {
        setEditSongData({
            name: song.name || '',
            originalBand: song.originalBand || '',
            bpm: song.bpm !== null && song.bpm !== undefined && song.bpm !== 0 ? song.bpm : null,
            key: song.key || '',
          });
    }
  }, [song, open]);

  const handleSave = async () => {
    await onUpdate(editSongData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  );
}
