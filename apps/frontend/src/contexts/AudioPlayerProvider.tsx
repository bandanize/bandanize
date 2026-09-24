import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { getMediaUrl } from '@/services/api';
import { AudioPlayerContext, type AudioPlayerState, type AudioTrack } from './audio-player';
import { FloatingAudioPlayer } from '@/app/components/FloatingAudioPlayer';

const initial: AudioPlayerState = { track: null, status: 'idle', position: 0, duration: 0, volume: 1, muted: false, collapsed: false };

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<AudioTrack | null>(null);
  const attempt = useRef(0);
  const [state, setState] = useState(initial);
  const patch = useCallback((value: Partial<AudioPlayerState>) => setState(previous => ({ ...previous, ...value })), []);

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !trackRef.current) return;
    const request = ++attempt.current;
    if (audio.error) audio.load();
    if (audio.ended) audio.currentTime = 0;
    patch({ status: 'loading' });
    // Called directly from a user gesture, including on iOS.
    void audio.play().catch(() => {
      if (request === attempt.current && trackRef.current) patch({ status: 'error' });
    });
  }, [patch]);
  const pause = useCallback(() => {
    ++attempt.current;
    audioRef.current?.pause();
    if (trackRef.current) patch({ status: 'paused' });
  }, [patch]);
  const close = useCallback(() => {
    ++attempt.current;
    trackRef.current = null;
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    setState(previous => ({ ...initial, volume: previous.volume, muted: previous.muted }));
  }, []);
  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !trackRef.current) return;
    if (audio.paused || audio.error) start(); else pause();
  }, [pause, start]);
  const toggleTrack = useCallback((track: AudioTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (trackRef.current?.url === track.url) { toggle(); return; }
    ++attempt.current;
    audio.pause();
    trackRef.current = track;
    audio.src = getMediaUrl(track.url);
    audio.load();
    patch({ track, position: 0, duration: 0, status: 'loading', collapsed: false });
    start();
  }, [patch, start, toggle]);
  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const position = Math.max(0, Math.min(audio.duration, seconds));
    audio.currentTime = position;
    patch({ position });
  }, [patch]);
  const changeVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const value = Math.max(0, Math.min(1, volume));
    audio.volume = value; audio.muted = value === 0;
    patch({ volume: value, muted: value === 0 });
  }, [patch]);
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    patch({ muted: audio.muted });
  }, [patch]);

  useEffect(() => {
    const audio = audioRef.current;
    // Video and global audio must not play over one another.
    const exclusive = (event: Event) => {
      if (event.target === audio) {
        document.querySelectorAll<HTMLMediaElement>('audio, video').forEach(other => { if (other !== audio) other.pause(); });
      } else if (event.target instanceof HTMLMediaElement && audio && !audio.paused) pause();
    };
    document.addEventListener('play', exclusive, true);
    return () => {
      document.removeEventListener('play', exclusive, true);
      ++attempt.current;
      if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    };
  }, [pause]);

  return <AudioPlayerContext.Provider value={{ ...state, toggleTrack, toggle, pause, seek, changeVolume, toggleMute, close,
    setCollapsed: collapsed => patch({ collapsed }) }}>
    <div className={state.track ? (state.collapsed ? 'pb-28' : 'pb-48') : undefined}>{children}</div>
    <audio ref={audioRef} data-global-audio preload="metadata" hidden
      onPlaying={event => { if (trackRef.current && !event.currentTarget.paused) patch({ status: 'playing' }); }}
      onWaiting={event => { if (trackRef.current && !event.currentTarget.paused) patch({ status: 'loading' }); }}
      onPause={event => { if (trackRef.current && event.currentTarget.paused && !event.currentTarget.ended && !event.currentTarget.error) patch({ status: 'paused' }); }}
      onEnded={event => { if (trackRef.current && event.currentTarget.ended) patch({ status: 'ended' }); }}
      onError={event => { if (trackRef.current && event.currentTarget.error) patch({ status: 'error' }); }}
      onTimeUpdate={event => { if (trackRef.current) patch({ position: event.currentTarget.currentTime }); }}
      onDurationChange={event => patch({ duration: Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0 })}
      onVolumeChange={event => patch({ volume: event.currentTarget.volume, muted: event.currentTarget.muted })} />
    <FloatingAudioPlayer />
  </AudioPlayerContext.Provider>;
}
