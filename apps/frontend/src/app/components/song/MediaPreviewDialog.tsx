import { useAudioPlayer } from '@/contexts/audio-player';
import { Button } from '@/app/components/ui/button';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { getMediaUrl } from '@/services/api';

interface MediaPreviewDialogProps {
  file: { url: string; type: string; name: string } | null;
  onClose: () => void;
}

export function MediaPreviewDialog({ file, onClose }: MediaPreviewDialogProps) {
  const { t } = useTranslation();
  const player = useAudioPlayer();
  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={onClose}>
        <DialogContent
          className="bg-card border-border text-foreground w-[95vw] sm:max-w-4xl rounded-xl p-4 sm:p-6"
          aria-describedby={undefined}
          onPointerDownOutside={(e) => {
            // Prevent dialog from closing when interacting with media controls
            const target = e.target as HTMLElement;
            if (target.closest('audio, video')) {
              e.preventDefault();
            }
          }}
        >
            <DialogHeader>
                <DialogTitle className="truncate pr-8">{file.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex justify-center w-full overflow-hidden">
                {file.type.startsWith('image') ? (
                    <img 
                        src={getMediaUrl(file.url)} 
                        alt={file.name} 
                        className="max-h-[70vh] w-auto object-contain rounded-md"
                    />
                ) : file.type.startsWith('video') ? (
                    <video playsInline 
                        controls 
                        preload="metadata"
                        className="max-h-[60vh] sm:max-h-[70vh] w-full rounded-md"
                        style={{ touchAction: 'auto' }}
                        src={getMediaUrl(file.url)}
                    >
                        Your browser does not support the video element.
                    </video>
                ) : file.type === 'application/pdf' ? (
                    <iframe
                        src={getMediaUrl(file.url)}
                        className="w-full h-[60vh] sm:h-[70vh] rounded-md border-0 bg-white"
                        title={file.name}
                    />
                ) : file.type.startsWith('audio/') ? (
                    <div className="w-full py-10 px-4 sm:px-8 bg-secondary/20 rounded-xl flex items-center justify-center">
                        <Button onClick={() => { player.toggleTrack(file); onClose(); }}>{t('player.open')}</Button>
                    </div>
                ) : <a href={getMediaUrl(file.url)} download={file.name} target="_blank" rel="noopener noreferrer" className="text-primary underline py-8">{t('workspace.download')}: {file.name}</a>}
            </div>
        </DialogContent>
    </Dialog>
  );
}
