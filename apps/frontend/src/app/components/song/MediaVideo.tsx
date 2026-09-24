import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Download, LoaderCircle } from 'lucide-react';
import { getMediaUrl } from '@/services/api';
import { isMpeg, type MediaFile } from '@/lib/media-kind';

const time = (value: number) => {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
};
export function MediaVideo({ file, onAudio, onError, className }: {
  file: MediaFile; onAudio: () => void; onError?: () => void; className?: string;
}) {
  const { t } = useTranslation();
  const transferred = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const transfer = () => {
    if (transferred.current) return;
    transferred.current = true;
    video.current?.pause(); onAudio();
  };
  const toggle = async () => {
    const media = video.current; if (!media) return;
    if (!media.paused) { media.pause(); return; }
    setFailed(false);
    if (media.error || media.ended) media.load();
    try { await media.play(); } catch { setWaiting(false); setFailed(true); }
  };
  const expand = async () => {
    try {
      if (document.fullscreenElement === frame.current) await document.exitFullscreen();
      else if (frame.current?.requestFullscreen) await frame.current.requestFullscreen();
      else (video.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.();
    } catch { /* Native iOS fullscreen remains available when supported. */ }
  };
  const icon = 'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary';
  return <div ref={frame} data-media-video className="w-full overflow-hidden rounded-xl border border-border bg-[#101113] text-foreground flex flex-col">
    <div className={fullscreen ? 'relative flex-1 min-h-0 flex items-center justify-center bg-black' : 'relative bg-black'}>
      <video ref={video} playsInline preload="metadata" src={getMediaUrl(file.url)}
        className={fullscreen ? 'w-full h-full object-contain' : (className || 'w-full max-h-[65vh]') + ' block min-h-32 object-contain mx-auto'}
        aria-label={file.name} onClick={() => void toggle()}
        onPlaying={() => { setPlaying(true); setWaiting(false); }}
        onPause={() => { setPlaying(false); setWaiting(false); }}
        onWaiting={() => { if (!video.current?.paused) setWaiting(true); }}
        onEnded={() => { setPlaying(false); setWaiting(false); }}
        onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
        onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onVolumeChange={event => { setMuted(event.currentTarget.muted); setVolume(event.currentTarget.volume); }}
        onError={() => { setFailed(true); setPlaying(false); setWaiting(false); onError?.(); }}
        onLoadedMetadata={event => {
          const media = event.currentTarget;
          if (media.readyState >= 1 && media.duration > 0 && media.videoWidth === 0 && media.videoHeight === 0) transfer();
        }} />
      {!playing && !failed && <button type="button" onClick={() => void toggle()} aria-label={t('player.play')}
        className="absolute inset-0 m-auto size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform focus-visible:outline-2 focus-visible:outline-white"><Play className="size-6 ml-1" fill="currentColor" /></button>}
      {waiting && <div className="absolute inset-0 grid place-items-center pointer-events-none"><LoaderCircle className="size-8 text-primary animate-spin" aria-label={t('loading')} /></div>}
    </div>
    <div className="px-3 py-2 space-y-1 bg-[#151618]">
      <input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(position,duration)} disabled={!duration}
        aria-label={t('media_viewer.seek')} className="w-full h-4 accent-primary cursor-pointer"
        onChange={event => { if (video.current) { video.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); } }} />
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => void toggle()} className={icon + ' !text-primary'} aria-label={t(playing ? 'player.pause' : 'player.play')}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <span className="text-[11px] tabular-nums text-muted-foreground whitespace-nowrap">{time(position)} / {time(duration)}</span>
        <div className="flex-1" />
        <button type="button" className={icon} aria-label={t(muted || volume === 0 ? 'player.unmute' : 'player.mute')} onClick={() => {
          const media = video.current; if (!media) return;
          if (media.volume === 0) { media.volume = 1; media.muted = false; } else media.muted = !media.muted;
        }}>{muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
        <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} aria-label={t('player.volume')}
          className="hidden sm:block w-16 accent-primary" onChange={event => { if (video.current) { video.current.volume = Number(event.target.value); video.current.muted = false; } }} />
        <a className={icon} href={getMediaUrl(file.url)} download={file.name} target="_blank" rel="noopener noreferrer" aria-label={t('workspace.download')}><Download size={17} /></a>
        <button type="button" className={icon} onClick={() => void expand()} aria-label={t(fullscreen ? 'media_viewer.exit_fullscreen' : 'media_viewer.fullscreen')}>{fullscreen ? <Minimize size={17} /> : <Maximize size={17} />}</button>
      </div>
      {failed && <p role="alert" className="text-xs text-muted-foreground py-2">{t('workspace.media_failed')}</p>}
      {isMpeg(file) && <button type="button" onClick={transfer} className="pb-1 text-xs text-primary hover:underline">{t('player.listen_as_audio')}</button>}
    </div>
  </div>;
}
