import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { getMediaUrl } from '@/services/api';

interface MediaPreviewDialogProps {
  file: { url: string; type: string; name: string } | null;
  onClose: () => void;
}

export function MediaPreviewDialog({ file, onClose }: MediaPreviewDialogProps) {
  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={onClose}>
        <DialogContent
          className="bg-card border-border text-foreground w-[95vw] max-w-4xl rounded-xl p-4 sm:p-6"
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
                    <video 
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
                ) : (
                    <div className="w-full py-10 px-4 sm:px-8 bg-secondary/20 rounded-xl flex items-center justify-center">
                        <audio 
                            controls 
                            preload="metadata"
                            className="w-full max-w-md h-12"
                            style={{ touchAction: 'auto' }}
                            src={getMediaUrl(file.url)}
                        >
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                )}
            </div>
        </DialogContent>
    </Dialog>
  );
}
