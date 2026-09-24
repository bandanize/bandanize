import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getMediaUrl } from '@/services/api';
import { isMpeg, type MediaFile } from '@/lib/media-kind';

export function MediaVideo({ file, onAudio, onError, className }: {
  file: MediaFile; onAudio: () => void; onError?: () => void; className?: string;
}) {
  const { t } = useTranslation();
  const transferred = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const transfer = () => {
    if (transferred.current) return;
    transferred.current = true;
    video.current?.pause();
    onAudio();
  };
  return <div className="w-full">
    <video ref={video} controls playsInline preload="metadata" src={getMediaUrl(file.url)}
      className={className} aria-label={file.name} onError={onError}
      onLoadedMetadata={event => {
        const media = event.currentTarget;
        // Wait for metadata: dimensions are also zero before anything has loaded.
        if (media.readyState >= 1 && media.duration > 0 && media.videoWidth === 0 && media.videoHeight === 0) transfer();
      }} />
    {isMpeg(file) && <button type="button" onClick={transfer} className="mt-2 text-xs text-primary hover:underline">{t('player.listen_as_audio')}</button>}
  </div>;
}
