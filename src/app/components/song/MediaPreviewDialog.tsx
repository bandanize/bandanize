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
        <DialogContent className="bg-[#151518] border-[#2B2B31] text-[#EDEDED] max-w-4xl w-full">
            <DialogHeader>
                <DialogTitle>{file.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex justify-center">
                {file.type.startsWith('image') ? (
                    <img 
                        src={getMediaUrl(file.url)} 
                        alt={file.name} 
                        className="max-h-[70vh] w-auto object-contain rounded-md"
                    />
                ) : file.type.startsWith('video') ? (
                    <video 
                        controls 
                        className="max-h-[70vh] w-full"
                        src={getMediaUrl(file.url)}
                    >
                        Your browser does not support the video element.
                    </video>
                ) : (
                    <audio 
                        controls 
                        className="w-full"
                        src={getMediaUrl(file.url)}
                    >
                        Your browser does not support the audio element.
                    </audio>
                )}
            </div>
        </DialogContent>
    </Dialog>
  );
}
