import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode, type RefObject } from 'react';
import api from '@/services/api';
import { useLocation } from 'react-router-dom';

export type ActivityKind = 'tabs' | 'files' | 'comments';
type Unread = Record<ActivityKind, string[]>;
type Summary = Record<string, Unread>;
const ActivityContext = createContext<{
  unread: Summary;
  markSeen: (songId: string, kind: ActivityKind, keys: string[]) => void;
}>({ unread: {}, markSeen: () => {} });

export function SongUnreadProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const { search } = useLocation();
  const refreshRef = useRef<() => void>(() => {});
  const [unread, setUnread] = useState<Summary>({});
  const epoch = useRef(0);
  const acknowledged = useRef(new Set<string>());
  const pending = useRef(new Set<string>());
  const retryAt = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    let loading = false;
    const refresh = async () => {
      if (loading || document.visibilityState !== 'visible') return;
      loading = true;
      const version = epoch.current;
      try {
        const { data } = await api.get('/bands/' + projectId + '/song-unread');
        if (!active || version !== epoch.current || pending.current.size || !Array.isArray(data)) return;
        const next: Summary = {};
        for (const item of data) {
          if (item?.songId != null && ['tabs', 'files', 'comments'].every(kind => Array.isArray(item[kind])))
            next[String(item.songId)] = { tabs: item.tabs, files: item.files, comments: item.comments };
        }
        setUnread(next);
      } catch { /* Older servers cannot report unread activity. Keep ordinary counters. */ }
      finally {
        loading = false;
        if (active && version !== epoch.current && !pending.current.size) void refresh();
      }
    };
    refreshRef.current = refresh;
    void refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false; mounted.current = false; refreshRef.current = () => {};
      clearInterval(interval); window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [projectId, search]);

  const markSeen = useCallback(async (songId: string, kind: ActivityKind, keys: string[]) => {
    if (Date.now() < retryAt.current || !mounted.current) return;
    const receiptKey = (key: string) => JSON.stringify([songId, kind, key]);
    const observed = [...new Set(keys)].filter(key => !acknowledged.current.has(receiptKey(key)) && !pending.current.has(receiptKey(key)));
    if (!observed.length) return;
    observed.forEach(key => pending.current.add(receiptKey(key)));
    epoch.current++;
    try {
      // Server limits each category to 500 resource IDs.
      for (let offset = 0; offset < observed.length; offset += 500) {
        const batch = observed.slice(offset, offset + 500);
        await api.post('/songs/' + songId + '/seen', { [kind]: batch });
        if (!mounted.current) return;
        batch.forEach(key => acknowledged.current.add(receiptKey(key)));
        setUnread(previous => {
          const song = previous[songId];
          return song ? { ...previous, [songId]: { ...song, [kind]: song[kind].filter(key => !batch.includes(key)) } } : previous;
        });
      }
    } catch { retryAt.current = Date.now() + 30000; }
    finally {
      observed.forEach(key => pending.current.delete(receiptKey(key))); epoch.current++;
      if (!pending.current.size) refreshRef.current();
    }
  }, []);
  return <ActivityContext.Provider value={{ unread, markSeen }}>{children}</ActivityContext.Provider>;
}

// Content must actually appear on screen; fetching it or mounting a hidden panel isn't reading it.
// The interval batches visible rows, retries transient failures and pauses in background tabs.
export function useSeenContent(root: RefObject<HTMLElement | null>, songId: string | undefined, kind: ActivityKind, revision: string) {
  const { markSeen } = useContext(ActivityContext);
  useEffect(() => {
    const host = root.current;
    if (!host || !songId) return;
    const visible = new Map<Element, number>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height >= Math.min(24, entry.boundingClientRect.height))
          visible.set(entry.target, visible.get(entry.target) ?? Date.now());
        else visible.delete(entry.target);
      });
    }, { threshold: [0, 0.01, 0.1, 0.5, 1] });
    const elements = host.matches('[data-seen-key]') ? [host] : Array.from(host.querySelectorAll('[data-seen-key]'));
    elements.forEach(element => observer.observe(element));
    const reset = () => { visible.forEach((_time, element) => visible.set(element, Date.now())); };
    document.addEventListener('visibilitychange', reset);
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || host.closest('[hidden]')) return;
      const keys = [...visible].filter(([element, since]) => Date.now() - since >= 800 && !element.closest('[hidden]'))
        .map(([element]) => element.getAttribute('data-seen-key')!).filter(Boolean);
      if (keys.length) void markSeen(songId, kind, keys);
    }, 1000);
    return () => { observer.disconnect(); clearInterval(timer); document.removeEventListener('visibilitychange', reset); };
  }, [root, songId, kind, revision, markSeen]);
}
export function useSongUnread(songId: string) {
  return useContext(ActivityContext).unread[songId];
}
