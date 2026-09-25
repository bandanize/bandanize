import { useEffect, useRef, useState } from 'react';
import api, { extractErrorMessage } from '@/services/api';

export function useTabEditLease(tabId: string) {
  const token = useRef<string | null>(null);
  const expiresAt = useRef(0);
  const alive = useRef(true);
  const [owner, setOwner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState(false);
  const [error, setError] = useState('');
  const release = async () => {
    const previous = token.current;
    token.current = null; expiresAt.current = 0;
    if (alive.current) setHeld(false);
    if (previous) {
      try { await api.delete('/tabs/' + tabId + '/edit-lock', { headers: { 'X-Tab-Edit-Token': previous }, timeout: 8000 }); }
      catch { /* The server lease expires automatically if release cannot reach it. */ }
    }
  };
  useEffect(() => {
    alive.current = true;
    let pending = false;
    const check = async () => {
      if (pending) return;
      pending = true;
      const currentToken = token.current;
      try {
        const response = currentToken
          ? await api.post('/tabs/' + tabId + '/edit-lock', { token: currentToken }, { timeout: 8000 })
          : await api.get('/tabs/' + tabId + '/edit-lock', { timeout: 8000, params: { _fresh: Date.now() } });
        if (!alive.current || token.current !== currentToken) return;
        if (currentToken) {
          expiresAt.current = Date.parse(response.data.expiresAt);
          setHeld(true); setError('');
        } else setOwner(response.data.locked ? response.data.ownerName : null);
      } catch (failure) {
        if (!alive.current || !currentToken || token.current !== currentToken) return;
        setHeld(false); setError(extractErrorMessage(failure));
      } finally { pending = false; }
    };
    void check();
    const timer = setInterval(check, 10000);
    const expiry = setInterval(() => {
      if (token.current && Date.now() >= expiresAt.current) setHeld(false);
    }, 1000);
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    return () => {
      alive.current = false; clearInterval(timer); clearInterval(expiry);
      window.removeEventListener('online', check); window.removeEventListener('focus', check);
      void release();
    };
    // The lifetime follows this keyed editor, not the state of a heartbeat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);
  const acquire = async (content: string) => {
    if (busy) return false;
    setBusy(true); setError('');
    try {
      const response = await api.post('/tabs/' + tabId + '/edit-lock', { content }, { timeout: 8000 });
      if (typeof response.data.token !== 'string') throw new Error('Editing protection is unavailable. Update the server before editing.');
      token.current = response.data.token;
      expiresAt.current = Date.parse(response.data.expiresAt);
      if (!alive.current) { await release(); return false; }
      setHeld(true); setOwner(null); return true;
    } catch (failure) {
      if (alive.current) setError(extractErrorMessage(failure));
      return false;
    } finally { if (alive.current) setBusy(false); }
  };
  return { acquire, release, token, held, owner, busy, error };
}
