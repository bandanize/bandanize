const KEY = 'bandanize.pendingInvite';
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
export function rememberInvite(token: string) {
  if (!TOKEN.test(token)) return;
  try { localStorage.setItem(KEY, JSON.stringify({ token, expiresAt: Date.now() + 7 * 86400000 })); } catch { /* Storage may be disabled. */ }
}
export function pendingInvitePath(): string | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (value && TOKEN.test(value.token) && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now())
      return '/join/' + value.token;
    localStorage.removeItem(KEY);
  } catch { /* Invalid or unavailable storage. */ }
  return null;
}
export function clearPendingInvite() {
  try { localStorage.removeItem(KEY); } catch { /* Storage may be disabled. */ }
}
