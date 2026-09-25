import { useEffect, useRef, useState } from 'react';
import api, { extractErrorMessage } from '@/services/api';

type Session = { id: string; active: boolean; token: string | null; expires: number; acquiring: boolean };
async function releaseToken(id: string, token: string) {
  try { await api.delete('/tabs/' + id + '/edit-lock', { headers: { 'X-Tab-Edit-Token': token }, timeout: 8000 }); }
  catch { /* Abandoned leases expire on the server. */ }
}
function expiry(value: unknown) {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(parsed)) throw new Error('Invalid editing protection response.');
  return parsed;
}
export function useTabEditLease(tabId: string) {
  const session = useRef<Session | null>(null);
  const token = useRef<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState(false);
  const [error, setError] = useState('');
  const release = async () => {
    const current = session.current;
    if (!current) return;
    const previous = current.token;
    current.token = null; current.expires = 0; token.current = null;
    setHeld(false);
    if (previous) await releaseToken(current.id, previous);
  };
  useEffect(() => {
    // Each effect lifetime has a distinct identity, including StrictMode remounts.
    const current: Session = { id: tabId, active: true, token: null, expires: 0, acquiring: false };
    session.current = current;
    token.current = null;
    let pending = false;
    const check = async () => {
      if (pending || current.acquiring) return;
      pending = true;
      const previous = current.token;
      try {
        const response = previous
          ? await api.post('/tabs/' + tabId + '/edit-lock', { token: previous }, { timeout: 8000 })
          : await api.get('/tabs/' + tabId + '/edit-lock', { timeout: 8000, params: { _fresh: Date.now() } });
        if (!current.active || current.token !== previous || current.acquiring) return;
        if (previous) {
          current.expires = expiry(response.data.expiresAt);
          setHeld(true); setError('');
        } else {
          setOwner(response.data.locked ? response.data.ownerName : null);
          setHeld(false); setBusy(false);
        }
      } catch (failure) {
        if (!current.active || current.token !== previous) return;
        setHeld(false); setError(extractErrorMessage(failure));
        // A rejected/expired token must not stop status refresh or explicit reacquisition.
        if ((failure as { response?: { status?: number } }).response?.status === 409) {
          current.token = null; token.current = null;
        }
      } finally { pending = false; }
    };
    void check();
    const timer = setInterval(check, 10000);
    const expiration = setInterval(() => {
      if (current.token && Date.now() >= current.expires) setHeld(false);
    }, 1000);
    const offline = () => setHeld(false);
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    window.addEventListener('offline', offline);
    return () => {
      current.active = false;
      clearInterval(timer); clearInterval(expiration);
      window.removeEventListener('online', check);
      window.removeEventListener('focus', check);
      window.removeEventListener('offline', offline);
      if (current.token) void releaseToken(current.id, current.token);
      current.token = null;
    };
  }, [tabId]);
  const acquire = async (content: string) => {
    const current = session.current;
    if (!current?.active || current.acquiring) return false;
    current.acquiring = true;
    setBusy(true); setError('');
    try {
      const response = await api.post('/tabs/' + current.id + '/edit-lock',
        current.token ? { token: current.token } : { content }, { timeout: 8000 });
      const acquired = response.data.token;
      if (typeof acquired !== 'string' || !acquired) throw new Error('Editing protection is unavailable. Update the server before editing.');
      if (!current.active) { await releaseToken(current.id, acquired); return false; }
      try { current.expires = expiry(response.data.expiresAt); }
      catch (failure) { await releaseToken(current.id, acquired); throw failure; }
      current.token = acquired; token.current = acquired;
      setHeld(true); setOwner(null); return true;
    } catch (failure) {
      if (current.active) {
        setHeld(false); setError(extractErrorMessage(failure));
        if ((failure as { response?: { status?: number } }).response?.status === 409) {
          current.token = null; token.current = null;
        }
      }
      return false;
    } finally {
      current.acquiring = false;
      if (current.active) setBusy(false);
    }
  };
  return { acquire, release, token, held, owner, busy, error };
}
