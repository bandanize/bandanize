import api from '@/services/api';
import { getAuthToken } from '@/lib/auth-session';

export interface LiveChange { kind: 'ready' | 'chat' | 'invitations' | 'projects'; bandId?: number }
export function connectLiveUpdates(onChange: (change: LiveChange) => void) {
  let stopped = false;
  let controller: AbortController | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const connect = async () => {
    controller = new AbortController();
    const resetWatchdog = () => { clearTimeout(watchdog); watchdog = setTimeout(() => controller?.abort(), 45000); };
    try {
      resetWatchdog();
      const response = await fetch(api.getUri({ url: '/live/events' }), {
        headers: { Authorization: 'Bearer ' + getAuthToken(), Accept: 'text/event-stream' },
        signal: controller.signal, cache: 'no-store',
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw new Error('Live connection unavailable');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        resetWatchdog();
        pending += decoder.decode(value, { stream: true }).replace(/\r/g, '');
        let boundary: number;
        while ((boundary = pending.indexOf('\n\n')) >= 0) {
          const frame = pending.slice(0, boundary); pending = pending.slice(boundary + 2);
          const event = frame.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim();
          if (event === 'ready') onChange({ kind: 'ready' });
          if (event === 'change') {
            const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
            const change = JSON.parse(data) as LiveChange;
            if (['chat', 'invitations', 'projects'].includes(change.kind)) onChange(change);
          }
        }
        if (pending.length > 65536) throw new Error('Invalid live event');
      }
    } catch { /* Background refresh remains available during disconnection. */ }
    finally {
      clearTimeout(watchdog);
      controller?.abort();
      if (!stopped) retry = setTimeout(connect, 3000);
    }
  };
  void connect();
  return () => { stopped = true; clearTimeout(retry); clearTimeout(watchdog); controller?.abort(); };
}
