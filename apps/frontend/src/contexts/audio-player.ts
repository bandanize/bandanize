import { createContext, useContext } from 'react';

export interface AudioTrack { url: string; name: string; type?: string }
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
export interface AudioPlayerState {
  track: AudioTrack | null;
  status: PlaybackStatus;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  collapsed: boolean;
}
export interface AudioPlayerValue extends AudioPlayerState {
  toggleTrack: (track: AudioTrack) => void;
  toggle: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  changeVolume: (volume: number) => void;
  toggleMute: () => void;
  setCollapsed: (collapsed: boolean) => void;
  close: () => void;
}
export const AudioPlayerContext = createContext<AudioPlayerValue | null>(null);
export function useAudioPlayer() {
  const player = useContext(AudioPlayerContext);
  if (!player) throw new Error('AudioPlayerProvider is required');
  return player;
}
