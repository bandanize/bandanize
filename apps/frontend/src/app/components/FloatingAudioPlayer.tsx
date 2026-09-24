import { Pause, Play, RotateCcw, Volume2, VolumeX, ChevronDown, ChevronUp, X, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAudioPlayer } from '@/contexts/audio-player';
import '@/styles/audio-player.css';

const time = (seconds: number) => {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
};
export function FloatingAudioPlayer() {
  const player = useAudioPlayer();
  const { t } = useTranslation();
  if (!player.track) return null;
  const playing = player.status === 'playing';
  const loading = player.status === 'loading';
  const active = playing || loading;
  const status = t('player.' + player.status);
  return <section className="floating-audio-player" aria-label={t('player.title')} data-playback={player.status}>
    <div className="audio-player-main">
      <div className="audio-mascot" data-mascot={playing ? 'playing' : 'waiting'} aria-hidden="true">
        {playing ? <span className="audio-mascot-window"><img className="audio-mascot-strip" src="/mascot/playing.svg" alt="" draggable={false} /></span>
          : <img className="audio-mascot-waiting" src="/mascot/waiting.svg" alt="" draggable={false} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('player.title')}</span>
          <div className="flex shrink-0">
            <button className="audio-icon-button" type="button" onClick={() => player.setCollapsed(!player.collapsed)}
              aria-label={t(player.collapsed ? 'player.expand' : 'player.collapse')} aria-expanded={!player.collapsed} aria-controls="audio-player-details">
              {player.collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            <button className="audio-icon-button" type="button" onClick={player.close} aria-label={t('player.close')}><X size={15} /></button>
          </div>
        </div>
        <p className="truncate text-sm font-medium leading-5" title={player.track.name}>{player.track.name}</p>
        <div className="mt-2 flex items-center gap-2">
          <button type="button" className="audio-play-button" onClick={player.toggle}
            aria-label={t(active ? 'player.pause' : player.status === 'error' ? 'player.retry' : 'player.play')}>
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : active ? <Pause size={17} fill="currentColor" /> : player.status === 'error' ? <RotateCcw size={17} /> : <Play size={17} fill="currentColor" />}
          </button>
          <span className="text-[11px] leading-4 text-muted-foreground" role="status">{status}</span>
        </div>
      </div>
    </div>
    <div id="audio-player-details" hidden={player.collapsed} className="audio-player-details">
      <input type="range" min={0} max={player.duration || 0} step={0.1} value={Math.min(player.position, player.duration || 0)}
        disabled={!player.duration} onChange={event => player.seek(Number(event.target.value))}
        aria-label={t('player.seek')} aria-valuetext={time(player.position) + ' / ' + time(player.duration)}
        className="audio-seek" />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] tabular-nums text-muted-foreground">{time(player.position)} <span className="opacity-50">/</span> {time(player.duration)}</span>
        <div className="flex items-center gap-1">
          <button type="button" className="audio-icon-button" onClick={player.toggleMute} aria-label={t(player.muted ? 'player.unmute' : 'player.mute')}>
            {player.muted || player.volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={player.muted ? 0 : player.volume}
            onChange={event => player.changeVolume(Number(event.target.value))} aria-label={t('player.volume')} className="audio-volume" />
        </div>
      </div>
    </div>
  </section>;
}
